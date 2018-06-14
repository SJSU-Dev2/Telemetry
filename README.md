# Telemetry

[![Telemetry Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/kammce/Telemetry)
[![Build Status](https://api.travis-ci.org/kammce/Telemetry.svg?branch=master)](https://travis-ci.org/kammce/Telemetry)
<!-- [![Inline docs](http://inch-ci.org/github/kammce/RoverCore-MC.svg?branch=master&style=shields)](http://inch-ci.org/github/kammce/RoverCore-MC) -->

Software for inspecting, visualizing and modifying variables within a embedded processors.

# Prerequisites
You need **python 2.x**, **pip** and **virtualenv** installed prior to installation.

## Install Dependencies on Ubuntu
`sudo apt install python python-pip virtualenv`

## Install on Mac OSX
1. Install Python: `brew install python`
2. Install pip: already installed from installing python
3. Install virtualenv: `pip install virtualenv`

## Install on Windows
1. Install latest Python2.x & PIP: https://www.python.org/downloads/
2. Install virtualenv: `pip install virtualenv`

# Install

0. Install Dependencies

1. Clone repository or download .zip

    git clone https://github.com/kammce/Telemetry.git

2. If you are on OSX or Linux Run **setup** script. If Windows, Do step 2.1

    `./setup`

2. If Windows:

    1. Create a virtual environemnt: `virtualenv modules`
    2. Activate virtual environment: `modules/Scripts/activate.bat`
    3. Install requirements: `pip install -r ./requirements.txt`
    4. To deactivate virtual by: `deactivate`

3. **DONE!**

# To run:

1. Activate virtual environment: `source modules/bin/active`
2. Run: `python Telemetry.py`
3. **Done!** At this point, on Mac and Linux, your default browswer should have opened a new URL with telemetry in it. On windows enter `http://localhost:5001/` into your browser of choice.
# Change Log

## Update 05.11.2018

* Fixed the fact that the instructions on README.md did not reference activating the virtual environment. 

## Update 09.27.2017

* Fixed KeyboardInterrupt by removing python thread and putting everything on one thread (main Flask thread).
* Now works with Python 3

# License

    kammce.io - Copyright (C) 2017

    This file is part of free software application meant for embedded processors
    development and testing. You can use it and/or distribute it as long as this
    copyright header remains unmodified.  The code is free for personal, educational,
    academic research, and commercial environment use but requires permission
    to be used in a commercial product.

    THIS SOFTWARE IS PROVIDED "AS IS".  NO WARRANTIES, WHETHER EXPRESS, IMPLIED
    OR STATUTORY, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
    MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE APPLY TO THIS SOFTWARE.
    I SHALL NOT, IN ANY CIRCUMSTANCES, BE LIABLE FOR SPECIAL, INCIDENTAL, OR
    CONSEQUENTIAL DAMAGES, FOR ANY REASON WHATSOEVER. THIS SOFTWARE MAY NOT BE
    SUBLICENSED WITHOUT PERMISSION.

    You can reach the author of this software at:
         k a m m c e c o r p @ g m a i l . c o m
