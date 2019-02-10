
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
  const encoder = new TextEncoder("utf-8");
  serial_extension.postMessage({
    "command": "write",
    "data": Array.from(encoder.encode(key))
  });
});

term.on('data', function (data, ev) {
  console.debug(data);
});