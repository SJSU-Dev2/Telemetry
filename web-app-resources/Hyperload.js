
let HyperloadStates = {
  "FindHyperload": 1,
  "FlashRequest": 2,
  "SetBaudRates": 3,
  "GetSystemInfo": 4,
  "PrepareBinaryForFlashing": 5,
  "TransmitApplicationToBoard": 6,
  "DetermineIfFlashWasSuccessful": 7,
  "BailOut": 8,
};

let HANDSHAKE_SEQUENCE = {
  "signature": 0xFF,
  "host_request": 0x55,
  "device_acknowledge": 0xAA
};

let SPECIAL_CHAR = {
  'Dollar': '$'.charCodeAt(0),
  'OK': '!'.charCodeAt(0),
  'Newline': '\n'.charCodeAt(0),
  'STAR': '*'.charCodeAt(0)
};

Object.freeze(HyperloadStates);
Object.freeze(HANDSHAKE_SEQUENCE);
Object.freeze(SPECIAL_CHAR);

let app_send = null;

class SerialController
{
  constructor()
  {
    this.serial_buffer_ = [];
    this.serial_recieve_function_ = null;
  }

  readByte(timeout)
  {
    timeout = (timeout) ? timeout : 5000;
    return new Promise(resolve => {
      // If serial buffer contains some text, immediatly resolve
      if (this.serial_buffer_.length !== 0) {
        resolve(this.serial_buffer_.shift());
        return;
      }
      // Setup a timeout to resolve the promise if serial_recieve_function
      // below isn't called in time
      let timer = setTimeout(() => {
        this.serial_recieve_function_ = null;
        console.debug("Read Byte Timed Out!!");
        resolve(undefined);
      }, timeout);
      // Setting serial_recieve_function which will resolve this promise if
      // it is executed by feed()
      this.serial_recieve_function_ = () => {
        clearTimeout(timer);
        this.serial_recieve_function_ = null;
        resolve(this.serial_buffer_.shift());
      }
    });
  }
  readUntil(timeout, deliminator)
  {
    let pullSubstringFromBuffer = () => {
      let deliminator_position = this.serial_buffer_.indexOf(deliminator);
      let substring = "";
      if(deliminator_position != -1)
      {
        substring = this.serial_buffer_.substr(0, deliminator_position);
        this.serial_buffer_ = this.serial_buffer_.substr(deliminator_position+1);
      }
      return substring;
    };
    timeout = (timeout) ? timeout : 5000;
    return new Promise(resolve => {
      // If serial buffer contains some text, immediatly resolve
      let deliminator_position = this.serial_buffer_.indexOf(deliminator);
      if (deliminator_position != -1) {
        resolve(pullSubstringFromBuffer());
        return;
      }
      // Setup a timeout to resolve the promise if serial_recieve_function
      // below isn't called in time
      let timer = setTimeout(() => {
        this.serial_recieve_function_ = null;
        console.debug("Read Until Timed Out!!");
        resolve(undefined);
      }, timeout);
      // Setting serial_recieve_function which will resolve this promise if
      // it is executed by feed()
      this.serial_recieve_function_ = () => {
        let substring = pullSubstringFromBuffer();
        if (substring)
        {
          clearTimeout(timer);
          this.serial_recieve_function_ = null;
          resolve(substring);
        }
      }
    });
  }
  write(data)
  {
    app_send({
      command: "write",
      data: data
    });
  }
  baud(baud_rate)
  {
    app_send({
      command: "update",
      data: {
        settings: {
          bitrate: baud_rate
        }
      }
    });
  }
  feed(data)
  {
    this.serial_buffer_ = this.serial_buffer_.concat(data);
    if(this.serial_recieve_function_)
    {
      this.serial_recieve_function_();
    }
  }
  flush()
  {
    this.serial_buffer_ = [];
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function ResetDevice()
{
  const ASSERT_RESET = {
    command: "control",
    data: {
      "dtr": true,
      "rts": false
    }
  };
  const DEASSERT_RESET = {
    command: "control",
    data: {
      "dtr": false,
      "rts": false
    }
  }
  return new Promise(async resolve => {
    await app_send(ASSERT_RESET);
    await sleep(1000);
    await app_send(DEASSERT_RESET);
    resolve();
  });
}

function getControlWord(baud_rate, cpu_speed)
{
  console.debug("Retrieving Control Word");
  controlWord = ((cpu_speed / (baud_rate * 16)) - 1);
  return controlWord;
}

function getBoardParameters(description_string)
{
  // Parsing String to obtain required Board Parameters
  let board_parameters_list = description_string.replace("\n", "").split(":");
  let board_parameters_dict = {
      'Board': board_parameters_list[0],
      'BlockSize': board_parameters_list[1],
      'BootloaderSize': parseInt(board_parameters_list[2]) * 2,
      'FlashSize': board_parameters_list[3]
  };
  console.debug("\n******* Board Information *******");
  console.debug("Board              = ", board_parameters_dict['Board']);
  console.debug("Block (Chunk) Size = ", board_parameters_dict['BlockSize']);
  console.debug("Bootloader Size    = ", board_parameters_dict['BootloaderSize']);
  console.debug("Flash Size         = ", board_parameters_dict['FlashSize']);
  console.debug("***********************************\n");
  return board_parameters_dict;
}

function getPageContent(binary, current_block, page_size)
{
  let start_offset = current_block * page_size;
  let page_content = new Uint8Array(page_size);

  for (let x = 0; x < page_size; x++) {
    page_content[x] = binary[start_offset + x];
  }

  return page_content;
}

function getChecksum(block) {
  let checksum = 0;
  for(let byte of block) {
    checksum = (checksum + byte) & 0xFF;
  }
  return checksum;
}

let serial_controller = new SerialController();
let hyperload_activated = false;

async function Hyperload(sender, application_binary, progress_bar)
{
  const BAUD = 576000; // 38400
  serial_controller.flush();
  app_send = sender;
  hyperload_activated = true;
  let state = HyperloadStates.FindHyperload;
  let breaker = true;
  let success = false;
  let board_parameters;

  let total_blocks = 0;
  let full_binary;
  progress_bar.style.opacity = 1.0;
  progress_bar.value = 0.0;
  progress_bar.className = "progress-red";

  while(breaker)
  {
    if (state != HyperloadStates.TransmitApplicationToBoard &&
        state != HyperloadStates.DetermineIfFlashWasSuccessful &&
        state != HyperloadStates.BailOut)
    {
      progress_bar.value = 0.2 * (state / HyperloadStates.BailOut);
    }
    switch(state)
    {
      default:
        setTimeout(() => {
          progress_bar.style.opacity = 0.0;
          setTimeout(() => {
            progress_bar.value = 0.0;
          }, 500);
        }, 500);
        breaker = false;
        break;
      case HyperloadStates.FindHyperload:
        console.debug("Resetting Device...");
        serial_controller.flush();
        await ResetDevice();
        await sleep(1);
        // Check if device emits a Hyperload signature after reset
        console.debug("Querying Device...");
        let hyperload_signature = await serial_controller.readByte();
        console.debug("hyperload_signature: ", hyperload_signature);
        // If it does, immediately break the loop. This will stop at the first
        // device with a hyperload response
        if (hyperload_signature === HANDSHAKE_SEQUENCE["signature"]) {
          console.debug("Found Hyperload Device");
          state = HyperloadStates.FlashRequest;
        } else {
          console.error("Couldn't Find any Hyperload Devices");
          state = HyperloadStates.BailOut;
        }
        break;
      case HyperloadStates.FlashRequest:
        serial_controller.write([HANDSHAKE_SEQUENCE["host_request"]]);

        console.debug(`Sending device program request...`);
        let sj2_device_discovered = await serial_controller.readByte();
        if (sj2_device_discovered == HANDSHAKE_SEQUENCE["device_acknowledge"])
        {
          console.debug(`Received Achnowledge ${sj2_device_discovered}!`);
          state = HyperloadStates.SetBaudRates;
        } else {
          console.error(`Did not recieve device program acknowledge!`);
          state = HyperloadStates.BailOut;
        }
        break;
      case HyperloadStates.SetBaudRates:
        let baud_rate_control_integer = getControlWord(BAUD, 48000000);
        console.debug(baud_rate_control_integer);

        let view = new DataView(new ArrayBuffer(4));
        view.setUint32(0, baud_rate_control_integer, true);
        let control_word = new Uint8Array(view.buffer);
        console.debug("Sending Control Word...", control_word);
        serial_controller.write(Array.from(control_word));

        let acknowledge_byte = await serial_controller.readByte();

        if (acknowledge_byte === control_word[0]) {
          console.warn("Acknowledge from Hyperload received!")
          serial_controller.baud(BAUD);
          state = HyperloadStates.GetSystemInfo;
        } else {
          console.error("Failed to receive Control Word Ack",
              control_word[0], acknowledge_byte);
          state = HyperloadStates.BailOut;
        }
        break;
      case HyperloadStates.GetSystemInfo:
        // Read the CPU Desc String
        console.debug("Getting System Info");
        start_of_cpu_description = await serial_controller.readByte();
        if (start_of_cpu_description !== SPECIAL_CHAR['Dollar']) {
          console.error("Failed to read CPU Description String");
          state = HyperloadStates.BailOut;
        } else {
          console.debug("Reading CPU Desc String...");
          let board_description = SPECIAL_CHAR['Dollar'];
          while(true) {
            let new_character = await serial_controller.readByte();
            board_description += String.fromCharCode(new_character);
            if (new_character === SPECIAL_CHAR['Newline']) {
              break;
            }
            console.debug("board_description", board_description);
            console.debug("new char =", new_character,
                "newline", SPECIAL_CHAR['Newline']);
          }
          console.debug("CPU Description String", board_description);
          board_parameters = getBoardParameters(board_description);
          // Receive OK from Hyperload
          if (SPECIAL_CHAR['OK'] != await serial_controller.readByte()) {
            console.error("Failed to Receive OK");
            state = HyperloadStates.BailOut;
          } else {
            console.debug("OK Received! Sending Block");
            state = HyperloadStates.PrepareBinaryForFlashing;
          }
        }
        break;
      case HyperloadStates.PrepareBinaryForFlashing:
        // Sending Blocks of Binary File
        let length = application_binary.length;
        total_blocks = length / board_parameters['BlockSize'];
        console.debug("Total Blocks", total_blocks);

        let paddingCount = length - (length % board_parameters['BlockSize']);
        console.debug("Total Padding Count", paddingCount);

        total_blocks = Math.ceil(total_blocks);
        console.debug("Total // of Blocks to be Flashed", total_blocks);

        // Pad 0's to application_binary if required.
        // TODO(): Figure out how to do this properly
        let complete_length = board_parameters['BlockSize'] * total_blocks;
        full_binary = new Uint8Array(complete_length);
        full_binary.fill(0xff, 0, full_binary.length);
        console.debug("full_binary before = ", full_binary);
        for (let x = 0; x < application_binary.length; x++) {
          full_binary[x] = application_binary[x];
        }
        console.debug("full_binary after = ", full_binary);
        state = HyperloadStates.TransmitApplicationToBoard;
        progress_bar.className = "progress-yellow";
        break;

      case HyperloadStates.TransmitApplicationToBoard:
        let current_block = 0;

        while (current_block < total_blocks)
        {
          let view = new DataView(new ArrayBuffer(2));
          view.setUint16(0, current_block, false);
          let current_block_bytes = new Uint8Array(view.buffer);
          console.debug("Sending Block Number...", current_block, current_block_bytes);
          serial_controller.write(Array.from(current_block_bytes));

          let block_content = getPageContent(full_binary, current_block,
                                        board_parameters['BlockSize']);
          console.debug(Array.from(block_content));
          serial_controller.write(Array.from(block_content));
          console.debug("Size of Block Written = ", block_content.length);

          let checksum = getChecksum(block_content);
          console.debug("Checksum = ", checksum);
          await sleep(1);
          serial_controller.write([checksum]);
          let acknowledge_byte = await serial_controller.readByte();
          if (acknowledge_byte != SPECIAL_CHAR['OK']) {
            console.error(
                `Device did not Ack checksum (${acknowledge_byte}, ${String.fromCharCode(acknowledge_byte)}) ... Retrying #${current_block}\n`);
          } else {
            current_block = current_block + 1;

            progress_bar.value = 0.2 + (0.9 * (current_block/total_blocks));
            if (progress_bar.value < .7) {
              progress_bar.className = "progress-yellow";
            } else if (progress_bar.value >= .7) {
              progress_bar.className = "progress-lime";
            }
          }
        }
        if (current_block != total_blocks) {
          console.error("Not all blocks were flashed");
          console.error("Total = " + str(total_blocks));
          console.error("// of Blocks Flashed = " + str(current_block));
          state = HyperloadStates.BailOut;
        } else {
          state = HyperloadStates.DetermineIfFlashWasSuccessful;
        }
        break;
      case HyperloadStates.DetermineIfFlashWasSuccessful:
        serial_controller.write([0xFF, 0xFF]);
        progress_bar.value = 1.0;
        if (SPECIAL_CHAR['STAR'] != await serial_controller.readByte()) {
          console.debug(final_acknowledge);
          console.error("Final Ack Not Received");
        } else {
          serial_controller.baud(38400);
          console.debug("Received Ack");
          console.debug("Flashing Successful!");
          success = true;
        }
        state = HyperloadStates.BailOut;
        break;
    }
  }
  hyperload_activated = false;
  return success;
}
