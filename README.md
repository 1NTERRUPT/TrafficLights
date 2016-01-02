# TrafficLights

### Raspberry Pi
1. Install [Raspbian Jessie](https://www.raspberrypi.org/downloads/raspbian/) on your Raspberry Pi
2. 

## Arduino
1. Install [arduino-mk](https://packages.debian.org/stretch/arduino-mk) at least version 1.5-2, at the time of writing it was [arduino-mk_1.5-2_all.deb](http://ftp.de.debian.org/debian/pool/main/a/arduino-mk/arduino-mk_1.5-2_all.deb)
1. Install [arduino-core](https://packages.debian.org/stretch/arduino-core), at the time of writing it was [arduino-core_1.0.5+dfsg2-4_all.deb](http://ftp.de.debian.org/debian/pool/main/a/arduino/arduino-core_1.0.5+dfsg2-4_all.deb)
1. git clone --recursive https://github.com/1NTERRUPT/TrafficLights /usr/share/
1. cd /usr/share/arduino
1. ln -s /usr/share/TrafficLights/arduino/libraries /usr/share/arduino/

## Web
1. adduser node
1. npm install express
1. cp /usr/share/TrafficLights/node-service /etc/init.d/ 
