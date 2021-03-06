let connections = {
  // "connect_id": {
  //   serial_id: NaN,
  //   serial_path: "",
  //   client: port,
  //   serial_device_list: []
  // }
};
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let previous_serial_count = -1;
let connections_changed = false;

function nop() { }

function convertStringToArrayBuffer(str) {
  if (str instanceof Uint8Array) {
    return str;
  }
  let buf = new ArrayBuffer(str.length);
  let bufView = new Uint8Array(buf);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}

function getConnectIdBySerialId(serial_id) {
  for (let connect_id in connections) {
    if (connections[connect_id].serial_id == serial_id) {
      return connect_id;
    }
  }
  return null;
}

function serialReceiveHandler(info) {
  console.debug(info);
  let connect_id = getConnectIdBySerialId(info.connectionId);
  if (info.data && connect_id) {
    connections[getConnectIdBySerialId(info.connectionId)].client.postMessage({
      responder: "read",
      data: Array.from(new Uint8Array(info.data))
    });
  }
}

function resetAndEmitConnect(serial_id, connect_id) {
  chrome.serial.setControlSignals(serial_id, { dtr: true, rts: false },
    async () => {
      await sleep(100);
      chrome.serial.setControlSignals(serial_id, { dtr: false, rts: false },
        () => {
          connections[connect_id].client.postMessage({ responder: "connect" });
        });
    });
}

function serialConnectHandler(connection_info, connect_id) {
  console.debug("connection_info: ", connection_info);
  let serial_id = connection_info.connectionId;
  connections[connect_id].serial_id = serial_id;
  resetAndEmitConnect(serial_id, connect_id);
}

function connectionHandler(request, connect_id) {
  switch (request.command) {
    case "list":
      chrome.serial.getDevices(list => {
        console.debug(list);
        connections[connect_id].client.postMessage({
          responder: "list",
          data: list
        });
      });
      return;
    case "connect":
      chrome.serial.connect(
        request.data.path,
        request.data.settings,
        (serial_info) => {
          connections[connect_id]["serial_connect_data"] = request.data;
          serialConnectHandler(serial_info, connect_id);
        }
      );
      return;
  }

  if (isNaN(connections[connect_id].serial_id)) {
    return;
  }

  switch (request.command) {
    case "status":
      break;
    case "control":
      console.debug(request.data);
      chrome.serial.setControlSignals(
        connections[connect_id].serial_id,
        request.data,
        nop
      );
      break;
    case "disconnect":
      console.debug(
        `Disconnect attempt on id '${connect_id}' on serial device id '${
        connections[connect_id].serial_id
        }'`
      );
      chrome.serial.disconnect(connections[connect_id].serial_id, () => {
        connections[connect_id].client.postMessage({ responder: "disconnect" });
      });
      break;
    case "update":
      chrome.serial.update(
        connections[connect_id].serial_id,
        request.data.settings,
        nop
      );
      break;
    case "pause":
      chrome.serial.setPaused(
        connections[connect_id].serial_id,
        request.data.pause,
        nop
      );
      break;
    case "write":
      chrome.serial.send(
        connections[connect_id].serial_id, new Uint8Array(request.data), nop);
      break;
    default:
      console.warn(`Invalid Command ${request.command}`);
      break;
  }
}

chrome.serial.onReceive.addListener(serialReceiveHandler);

chrome.serial.onReceiveError.addListener(event => {
  console.warn(event);
  let connect_id = getConnectIdBySerialId(event.connectionId);
  switch (event.error) {
    case "device_lost":
    case "system_error":
      chrome.serial.disconnect(connections[connect_id].serial_id, () => {
        connections[connect_id].client.postMessage({ responder: "disconnect" });
        connections[connect_id].serial_id = NaN;
      });
      break;
    case "overrun":
    case "break":
      chrome.serial.setPaused(event.connectionId, false, nop);
      break;
    default:
      console.error("Unhandled serial event occurred!", event);
      connections[connect_id].client.postMessage({
        responder: "error",
        data: event
      });
  }
});

chrome.runtime.onConnectExternal.addListener(port => {
  console.debug(port);
  let connect_id = port.name;
  connections_changed = true;

  connections[connect_id] = {
    serial_id: NaN,
    client: port
  };

  connections[connect_id].client.onMessage.addListener(request => {
    console.debug(`Connection ${connect_id} received`, request);
    connectionHandler(request, connect_id);
  });
  connections[connect_id].client.onDisconnect.addListener(() => {
    console.log(`Connection ${connect_id} has disconnected.`);
    if (!isNaN(connections[connect_id].serial_id)) {
      chrome.serial.disconnect(connections[connect_id].serial_id, nop);
    }
    connections_changed = true;
    delete connections[connect_id];
  });
});

function checkSerialPortList() {
  chrome.serial.getDevices(async (list) => {
    let number_of_connections = Object.keys(connections).length;

    if (previous_serial_count != list.length || connections_changed) {
      console.debug("Update to list of serial ports: ", list);

      previous_serial_count = list.length;
      connections_changed = false;

      for (let connect_id in connections) {
        try {
          connections[connect_id].client.postMessage({
            responder: "list",
            data: list
          });
        } catch (event) {
          console.debug(event);
          console.log("Failed to send list to connection ", connect_id);
          console.log("Removing connection from connections list");
          delete connections[connect_id];
        }
      }
    }

    await sleep(100);
    checkSerialPortList();
  });
}

checkSerialPortList();

chrome.runtime.onMessageExternal.addListener(
  (message, sender, sendResponse) => {
    if (message == "version") {
      const manifest = chrome.runtime.getManifest();
      sendResponse({
        type: "success",
        version: manifest.version
      });
      return true;
    }
    return false;
  }
);