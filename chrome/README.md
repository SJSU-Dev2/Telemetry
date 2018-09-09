Telemetry Serial Chrome App Extension
========================================

To add this to your apps, go to `chrome://extensions` and press the button `Load unpacked`.

Navigate to the unziped serial folder and press `add folder`.

Use `python -m SimpleHTTPServer 8080` to make your serial folder a server.

Then go to `http://localhost:8080/test.html` and make sure to open up the web console. You can do the same in the extensions page in the apps area. Connect a serial device that outputs some serial (an Arduino that prints something will do).

When you first press the `Reset Serial`, it will connect to the serial port. Everytime you press the `Reset Serial` afterwards will dump the serial response from the device to the console.log.

This is the start of the all web version of Telemetry. Play around with this, clean it up, add features, and see if you can get the backend to approximate the python backend.

We shall work on this more together soon. I want to get this done so we can omit having ot install the "proper" version of python on everyone's machine.