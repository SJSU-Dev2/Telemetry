//===================================
//  GLOBALS
//===================================
let device_connected = false;
let history_position = 0;
let command_history = [];
const CHROME_EXTENSION_ID = "fmbgflhmjkcgohkhjobldjjgpbgpljdl";
const flags = new Flags();
const change_event = new Event("change");
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base"
});
//===================================
//  Parsers & Generator Functions
//===================================
function GenerateConnectionId(length) {
  return Math.random()
    .toString(36)
    .slice(2);
}
function generateDropDownList(port_info) {
  if (port_info.length == 0) {
    return '<option value="-1" selected="selected">No Serial Ports</option>';
  }
  // Convert port_info array into an array of serial port paths
  const paths = port_info.map(port => {
    return port.path;
  });
  // Sort using numeric language sensitive string comparison.
  // This will result in a list like so:
  //    ["COM1", "COM2", "COM22", "COM100", "COM120"]
  //
  // vs ES6's default string sort which would result in:
  //
  //    ["COM1", "COM100", "COM120", "COM2", "COM22"]
  //
  paths.sort(collator.compare);
  console.debug(port_info, paths);
  var selected = document.querySelector("#device-select").value;
  let html = "";
  for (let i = 0; i < paths.length; i++) {
    html += `
      <option value="${paths[i]}"
      ${paths[i] === selected ? 'selected="selected"' : ""}>
          ${paths[i]}
      </option>`;
  }
  return html;
}

function generateCommandListHtml(command_list) {
  if (!command_list) {
    return "";
  }

  let html = "";
  for (let command of command_list) {
    html += `<option value="${command}" />`;
  }
  return html;
}
//===================================
//  Connect to Chrome App
//===================================
// "fmknhfahjnejmacfdpabmgembcgidplm"
let serial_extension = undefined;

//===================================
//  Button Click Listeners
//===================================
document.querySelector("#connect").addEventListener("click", () => {
  let device = flags.get("device-select");
  console.log(device);

  if (device_connected) {
    serial_extension.postMessage({ command: "disconnect" });
    return;
  } else if (!device) {
    alert("Invalid serial device selected!");
    return;
  }

  serial_extension.postMessage({
    command: "connect",
    data: {
      path: device,
      settings: {
        bitrate: parseInt(flags.get("baudrate"))
      }
    }
  });
});

document.querySelector("#serial-input").addEventListener("keyup", event => {
  const DOWN_ARROW = 38;
  const UP_ARROW = 40;
  const ENTER_KEY = 13;

  let count_change_flag = true;

  switch (event.which) {
    case UP_ARROW:
      if (history_position > 0) {
        history_position--;
      }
      break;
    case DOWN_ARROW:
      if (history_position < command_history.length) {
        history_position++;
      }
      break;
    case ENTER_KEY:
      $("#serial-send").click();
      break;
    default:
      count_change_flag = false;
      break;
  }
  if (count_change_flag) {
    let command = command_history[command_history.length - history_position];
    if (command) {
      document.querySelector("#serial-input").value = command;
    }
  }
});

document.querySelector("#serial-send").addEventListener("click", () => {
  let payload = $("#serial-input").val();
  $("#serial-input").val("");

  if (payload !== command_history[command_history.length - 1]) {
    command_history.push(payload);
  }

  history_position = 0;

  let cr = flags.get("carriage-return-select") ? "\r" : "";
  let nl = flags.get("newline-select") ? "\n" : "";

  serial_extension.postMessage({
    command: "write",
    data: `${payload}${cr}${nl}`
  });
});

//Clear Button Code
document.querySelector("#clear-button").addEventListener("click", () => {
  // [0m = Reset color codes
  // [3J = Remove terminal buffer
  // [2J = Clear screen
  // [H  = Return to home (0,0)
  term.write("\x1b[0m\x1b[3J\x1b[2J\x1b[H");
});

//Command History Code
document
  .querySelector("#clear-cache-modal-open")
  .addEventListener("click", () => {
    $("#clear-cache-modal").modal("show");
  });

document.querySelector("#clear-command-cache").addEventListener("click", () => {
  flags.set("command-history", [
    /* empty array */
  ]);
});

//Serial File Upload
document.querySelector("#serial-upload").addEventListener("click", () => {
  let serial_file = document.querySelector("#serial-file").files;
  if (!flags.get("device-connected").asBool()) {
    alert("Please connect a device before uploading a file.");
    return;
  } else if (serial_file.length === 0) {
    alert("No file selected");
    console.debug("No file");
    return;
  }

  let file = serial_file.item(0);
  let reader = new FileReader();

  // This event listener will be fired once reader.readAsText() finishes
  reader.onload = () => {
    serial_extension.postMessage({
      command: "write",
      data: reader.result
    });
  };
  // Initiate reading of uploaded file
  reader.readAsText(file);
});

//===================================
//  Initialize everything
//===================================
function chromeAppMessageHandler(response) {
  console.debug(response);
  switch (response.responder) {
    case "list":
      const list_html = generateDropDownList(response.data);
      document.querySelector("#device-select").innerHTML = list_html;
      document.querySelector("#device-select").dispatchEvent(change_event);
      break;
    case "connect":
      device_connected = true;
      $("#connect")
        .removeClass("btn-outline-success")
        .addClass("btn-outline-danger")
        .text("Disconnect");
      document.querySelector("#baudrate").setAttribute("disabled", "disabled");
      document
        .querySelector("#device-select")
        .setAttribute("disabled", "disabled");
      break;
    case "disconnect":
      // TODO(kammce): Actually evaluate that the device has connected properly
      device_connected = false;
      table_init = false;
      telemetry_raw = "\r\n";
      $("#connect")
        .addClass("btn-outline-success")
        .removeClass("btn-outline-danger")
        .text("Connect");
      document.querySelector("#baudrate").removeAttribute("disabled");
      document.querySelector("#device-select").removeAttribute("disabled");
      $("#refresh").click();
      break;
    case "update":
      break;
    case "read":
      term.write(response.data.replace(/\n/g, "\r\n"));
      break;
    default:
      console.warn("Unknown response");
      break;
  }
}

function RtsDtrControlHandler() {
  console.log("RtsDtrControlHandler");
  let rts_flag = document.querySelector("#rts-control").checked ? true : false;
  let dtr_flag = document.querySelector("#dtr-control").checked ? true : false;

  serial_extension.postMessage({
    command: "control",
    data: {
      dtr: dtr_flag,
      rts: rts_flag
    }
  });
}

function ApplyDarkTheme(dark_theme_active) {
  console.debug("Dark theme: ", dark_theme_active);
  let head = document.querySelector("head");
  if (dark_theme_active) {
    head.innerHTML += `<link
      rel="stylesheet"
      type="text/css"
      id="dark-style"
      href="static/lib/themes/dark-theme.css">`;
  } else {
    let dark_style = document.querySelector("#dark-style");
    if (dark_style) {
      head.removeChild(dark_style);
    }
  }
}

function commandHistoryUpdateHandler(command_list) {
  let command_history_element = document.querySelector("#command-history");
  command_history_element.innerHTML = generateCommandListHtml(command_list);
  console.debug("Command history updated");
}

flags.attach("baudrate", "change", "38400");
flags.attach("dtr-control", "change", false, RtsDtrControlHandler);
flags.attach("rts-control", "change", false, RtsDtrControlHandler);
flags.attach("reset-on-connect", "change");
flags.attach("carriage-return-select", "change");
flags.attach("newline-select", "change");
flags.attach("dark-theme", "change", false, ApplyDarkTheme, ApplyDarkTheme);
flags.attach("device-select", "change");
flags.attach("chrome-app-id", "change");
flags.bind("command-history", commandHistoryUpdateHandler, []);

function main() {
  term.open(document.querySelector("#terminal"));
  term.fit();

  flags.initialize();
  let app_id = flags.get("chrome-app-id");
  console.debug("chrome-app-id = ", app_id);

  if (!app_id) {
    app_id = CHROME_EXTENSION_ID;
    console.debug("Using CHROME_EXTENSION_ID:", app_id);
  }
  // Check the version of the app, and if a valid respones comes back, attempt
  // to connect to the app.
  chrome.runtime.sendMessage(app_id, "version", (response) => {
    if (response) {
      serial_extension = chrome.runtime.connect(
        app_id,
        { name: GenerateConnectionId() }
      );
      let app_connection = document.querySelector("#app-connection-indicator");
      app_connection.classList.remove("disconnected-text");
      app_connection.classList.add("connected-text");
      serial_extension.onMessage.addListener(chromeAppMessageHandler);
    } else {
      $("#not-connected-modal").modal("show");
      serial_extension = {
        postMessage: () => {
          $("#not-connected-modal").modal("show");
        }
      };
    }
  });
}

window.onbeforeunload = () => {
  let command_history = flags.get("command-history");
  if (command_history) {
    flags.set("command-history", command_history.slice(0, 99));
  }
  flags.teardown();
  return null;
};
window.addEventListener("resize", () => {
  term.fit();
});
// Entry point of software start
window.addEventListener("load", main);
