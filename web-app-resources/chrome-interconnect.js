
//===================================
//  Connect to Chrome App
//===================================
// "fmknhfahjnejmacfdpabmgembcgidplm"
const EXTENSION_ID = flags.get("chrome-app-id");
const serial_extension = chrome.runtime.connect(EXTENSION_ID, {
  name: "serial"
});
serial_extension.onMessage.addListener((response) => {
  console.log(response);
  switch(response.responder)
  {
    case "list":
      const list_html = generateDropDownList(response.data);
      document.querySelector("#device-select").innerHTML = list_html;
      break;
    case "connect":
      device_connected = true;
      $("#connect")
        .removeClass("btn-outline-success")
        .addClass("btn-outline-danger")
        .text("Disconnect");
      document.querySelector("#serial-baud-select")
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
      document.querySelector("#serial-baud-select").removeAttribute("disabled");
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
});
