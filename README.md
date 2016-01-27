# TrafficLights

## Raspberry Pi
1. Install [Raspbian Jessie](https://www.raspberrypi.org/downloads/raspbian/) on your Raspberry Pi
1. Login as root, as steps in this section require superuser powers ```sudo su```
1. Run raspi-config, install editors, set passwords and do anything else to make yourself comfortable in the system.
1. Upgrade the system to be on the safe side ```apt-get update; apt-get upgrade```
1. Allow ping from non-root users ```sudo chmod u+s /bin/ping```
1. Install nodejs (version on RPi is not OK). Basically you follow [official instructions](https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions).  This procedure will remove old packages nodejs-legacy nodered 
```
curl -sL https://deb.nodesource.com/setup_4.x | sudo bash -
apt-get install nodejs
```
1. Login as pi and while in home directory /home/pi checkout TrafficLights code
```
git clone --recursive https://github.com/1NTERRUPT/TrafficLights
```

## Arduino
1. Login as root and install necessary arduino libraries
1. Install official arduino-mk package (to get all additional packages and dependencies right) ```apt-get install arduino-mk```
1. Install [arduino-mk](https://packages.debian.org/stretch/arduino-mk) at least version 1.5-2, at the time of writing it was [arduino-mk_1.5-2_all.deb](http://ftp.de.debian.org/debian/pool/main/a/arduino-mk/arduino-mk_1.5-2_all.deb)
1. Install [arduino-core](https://packages.debian.org/stretch/arduino-core), at the time of writing it was [arduino-core_1.0.5+dfsg2-4_all.deb](http://ftp.de.debian.org/debian/pool/main/a/arduino/arduino-core_1.0.5+dfsg2-4_all.deb)
```
cd /root
# first install official jessie package to get all additional packages and dependencies right
apt-get install arduino-mk
# download latest packages and install them
wget http://ftp.de.debian.org/debian/pool/main/a/arduino-mk/arduino-mk_1.5-2_all.deb
wget http://ftp.de.debian.org/debian/pool/main/a/arduino/arduino-core_1.0.5+dfsg2-4_all.deb
dpkg -i arduino*.deb
```
1. Login as pi compile and upload code to arduino 
```
cd ~/TrafficLights/arduino
make
make upload
``` 

## Web
1. login as pi and install necessary nodejs modules locally
```
cd ~/TrafficLights/webserver
npm install express
npm install socket.io
npm install serialport
```
1. Download p5.js libraries (need to automate this perhaps using modules from GitHub)
```
cd ~/TrafficLights/html/lib
wget https://github.com/processing/p5.js/releases/download/0.4.20/p5.js
wget https://github.com/processing/p5.js/releases/download/0.4.20/p5.dom.js
wget https://github.com/processing/p5.js/releases/download/0.4.20/p5.sound.js
wget https://raw.githubusercontent.com/molleindustria/p5.play/master/lib/p5.play.js

```
1. In separate terminal under user pi start webserver
```
cd ~/TrafficLights/webserver
nodejs ./server.js /dev/ttyACM0
```

### Browser
1. Open browser (better to use Chrome) and navigate to http://ip-address-of-raspberry:8080

### Notes
1. If you modify arduino code, you need to stop nodejs server first, and only after that recompile and reload code in Arduino.
1. JS code requires consumes noticeable amount of computer power. You may want to close extra browser tabs.
1. You may want to use screen to run nodejs server in background:
```
cd ~/TrafficLights/webserver
screen nodejs ./server.js /dev/ttyACM0
... Then press Ctrl-A D to detach from process ...
``` 
### Credits
1. [Icons](http://www.opensecurityarchitecture.org/cms/library/icon-library) from Open Security Architecture project 
1. [Car images](http://opengameart.org/content/free-top-down-car-sprites-by-unlucky-studio) from SUjit Kumar Yadav by Unlucky Studio 
