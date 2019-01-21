
Terminal.applyAddon(fit);

let term = new Terminal({
  bellSound: "both",
  bellStyle: "sound",
  cursorBlink: true,
  lineHeight: 1,
  fontSize: 18,
  fontFamily: "Ubuntu Mono, courier-new, courier, monospace",
  scrollback: 1024,
});

term.on('key', function (key, event) {
  key = (event.code == "Backspace") ? "\b" : key;
  key = (event.code == "Enter") ? "\n" : key;
  serial_extension.postMessage({
    "command": "write",
    "data": key
  });
});

term.on('data', function (data, ev) {
  console.debug(data);
});