
Terminal.applyAddon(fit);

let term = new Terminal({
  bellSound: "both",
  bellStyle: "sound",
  cursorBlink: true,
  lineHeight: 1,
  fontFamily: "monospace",
  scrollback: 1024,
});

term.on('key', function (key, event) {
  key = (event.code == "Backspace") ? "\b" : key;
  key = (event.code == "\r") ? "\n" : key;
  serial_extension.postMessage({
    "command": "write",
    "data": key
  });
});

term.on('data', function (data, ev) {
  console.debug(data);
});