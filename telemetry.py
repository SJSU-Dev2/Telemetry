#
 #    kammce.io - Copyright (C) 2017
 #
 #    This file is part of free software application meant for embedded processors
 #    development and testing. You can use it and/or distribute it as long as this
 #    copyright header remains unmodified.  The code is free for personal, educational,
 #    academic research, and commercial environment use but requires permission
 #    to be used in a commercial product.
 #
 #    THIS SOFTWARE IS PROVIDED "AS IS".  NO WARRANTIES, WHETHER EXPRESS, IMPLIED
 #    OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
 #    MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE APPLY TO THIS SOFTWARE.
 #    I SHALL NOT, IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL, OR
 #    CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER. THIS SOFTWARE MAY NOT BE
 #    SUBLICENSED WITHOUT PERMISSION.
 #
 #    You can reach the author of this software at:
 #         k a m m c e c o r p @ g m a i l . c o m
 #

from __future__ import division
from flask import Flask, render_template, send_from_directory, abort, request
import threading
import serial
import serial.tools.list_ports
import time
import glob
import json
import re
import os
import logging
import webbrowser
import sys
from enum import Enum

log = logging.getLogger('werkzeug')
log.setLevel(logging.ERROR)

class State(Enum):
    OFFLINE = 0
    SYSTEM_BOOTING = 1
    ONLINE_SYS_PROMPT = 2

# INITIAL STATE
state                           = State.OFFLINE
# CONSTANTS
SERIAL_READ_CONSTANT_LENGTH     = 100000
# BAUDRATE                        = 115200
MILLIS_RATIO                    = (1/1000)
SUCCESS                         = "SUCCESS"
FAILURE                         = "FAILURE"
POSSIBLE_PROMPTS                = ("LPC: ","CLI> ")
PROMPT_CAPTURE_GROUP            = "("+("|".join(POSSIBLE_PROMPTS))+")"
FULL_TELEMETRY_PATTERN          = re.compile('(?s)'+PROMPT_CAPTURE_GROUP+'telemetry ascii(.*)[\x03][\x03][\x04][\x04][ ]{3}Finished in [0-9]+ us[\r]*\n')
PARTIAL_TELEMETETRY_PATTERN     = re.compile('(?s)'+PROMPT_CAPTURE_GROUP+'telemetry ascii(.*)')

# SETUP FLASK APPLICATION
app                             = Flask(__name__)
app.debug                       = False

# SERIAL DATA STORAGE
serial_output                   = b""
baudrate                        = 38400

# SETUP SERIAL PORT
list_ports                      = serial.tools.list_ports
ser                             = serial.Serial()
ser.baudrate                    = baudrate
ser.rts                         = False
ser.dtr                         = False
ser.timeout                     = 0
current_prompt                  = b""

# THREAD VARIABLES
lock = threading.Lock()

def read_serial():
    global serial_output
    global state
    global current_prompt

    success = True

    if ser.is_open == True:
        # Check if system is booting
        if state == State.SYSTEM_BOOTING:
            # If we find a LPC: prompt, then we change state to ONLINE_SYS_PROMPT
            for prompt in POSSIBLE_PROMPTS:
                if serial_output.rfind(prompt) != -1:
                    state = State.ONLINE_SYS_PROMPT
                    current_prompt = prompt

        # Lock control of serial device
        lock.acquire()
        try:
            # Read from serial device
            serial_output += ser.read(ser.inWaiting()).decode(encoding='ascii', errors='ignore') # "utf-8", "ignore"
            serial_output = serial_output.replace('\r', '')
        except Exception as e:
            print("Serial read exception: " + str(e))
            if(str(e) == "[Errno 5] Input/output error"):
                success = False
        # Release serial lock
        lock.release()

    return success

def get_telemetry():
    global serial_output
    lock.acquire()
    DELAY_PERIOD  = 10 # ms
    TIMEOUT_LIMIT = 1000 # ms
    # Define telemetry variable
    ''' The default and "invalid" telemetry value is an empty string '''
    telemetry     = ""
    done          = False
    timeout_time  = 0
    telemetry_msg = "telemetry ascii\n"

    if ser.is_open == True and state == State.ONLINE_SYS_PROMPT:
        ser.write(telemetry_msg.encode())

        while(not done):
            time.sleep(10 * MILLIS_RATIO)

            try:
                serial_output += ser.read(ser.inWaiting()).decode() # "utf-8", "ignore"
            except Exception as e:
                print("Telemetry Serial read exception" + str(e))
                continue

            end_array = FULL_TELEMETRY_PATTERN.findall(serial_output)

            # print(serial_output)
            # print(end_array)

            if len(end_array) > 0:
                telemetry  = end_array[-1][-1]
                # If telemetry is found, trim it from the serial_output
                serial_tmp = FULL_TELEMETRY_PATTERN.sub('', serial_output)
                serial_tmp = PARTIAL_TELEMETETRY_PATTERN.sub('', serial_tmp)
                serial_tmp = serial_tmp.replace('\r', '')
                serial_output = serial_tmp
                # if not serial_output.endswith(current_prompt):
                #     serial_output += current_prompt
                done = True

            timeout_time += DELAY_PERIOD
            if(timeout_time > TIMEOUT_LIMIT):
                break

    lock.release()
    return telemetry

## SERVER FILE ROUTES
# Serve up JavaScript files
@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)
# Serve up CSS files
@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)
# Serve files within lib (library) folder
@app.route('/lib/<path:path>')
def send_lib(path):
    return send_from_directory('lib', path)
# Serve up index.html file when GET / request is received
@app.route('/')
def index():
    return render_template("index.html", version="version 0.0.2")
# Respond to requester with SUCCESS
'''
The purpose of this function is to determine if the server is alive and can respond to this request.
The requester's XHR will return error if the server does not resolve or has a timeout.
'''
@app.route('/server-is-alive')
def server_is_alive():
    return SUCCESS
# Returns results of get_telemetry()
@app.route('/telemetry')
def telemetry():
    return get_telemetry()
# Return the list of serial devices on system
@app.route('/list')
def list():
    # Get COM port iterator list
    port_iterator = list_ports.comports()
    # Empty list to fill with COM port paths
    ports         = []
    # Iterate through port_iterator elements
    # and push to ports list
    for element in port_iterator:
        ports.append(element.device)
    # Sort the ports
    ports = sorted(ports)
    # Return JSON (array) back to client
    return json.dumps(ports)

# Connect serial to device and return success
@app.route('/connect', methods=['GET'])
def connect():
    global serial_output
    global state
    device = request.args.get('device')
    ser.close()
    serial_output = ""
    ser.port = device
    state = State.SYSTEM_BOOTING
    ser.open()
    return SUCCESS
# Change baud rate of serial device
@app.route('/baudrate/<int:baud>')
def devicebaud(baud):
    ser.baudrate = baud
    return SUCCESS
# Disconnect from serial device
@app.route('/disconnect', methods=['GET'])
def disconnect():
    global state
    ser.close()
    state = State.OFFLINE
    return SUCCESS
# Return serial_output
@app.route('/serial')
def serial():
    success = read_serial()
    if(not success):
        print("should be giving a 400 error right now!")
        abort(400)
    return serial_output
# Serial write string (payload) to serial device
@app.route('/write/<string:payload>/<int:carriage_return>/<int:newline>')
def write(payload="", carriage_return=0, newline=0):
    lock.acquire()

    cr = ""
    nl = ""

    if carriage_return == 1:
        cr = "\r"
    if newline == 1:
        nl = "\n"

    payload = payload+cr+nl

    ser.write(payload.encode())
    lock.release()
    return SUCCESS
# Perform a telemetry set variable operation
@app.route('/set/<string:component_name>/<string:variable_name>/<string:value>')
def set(component_name, variable_name, value):
    lock.acquire()
    payload = "telemetry %s %s %s\n" % (component_name, variable_name, value)
    ser.write(payload.encode())
    lock.release()
    return SUCCESS

if __name__ == "__main__":
    port = 5001
    if len(sys.argv) == 2:
        port = sys.argv[1]
    # Open This application's web URL in default browser
    webbrowser.open('http://localhost:%s' % (port), 2)
    # Run Flask Application
    try:
        print("* Telemetry interface is available at this address http://localhost:%s/" % (port) )
        app.run("localhost", port)
    except KeyboardInterrupt as e:
        print(str(e))
        quit()
        pass
