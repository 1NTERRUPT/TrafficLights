# TrafficLights

## Arduino
1. Install [arduino-mk](https://packages.debian.org/stretch/arduino-mk) at least v1.5-2
1. Install [arduino-core](https://packages.debian.org/stretch/arduino-core)
1. git clone --recursive https://github.com/1NTERRUPT/TrafficLights /usr/share/
1. cd /usr/share/arduino
1. ln -s /usr/share/TrafficLights/arduino/libraries /usr/share/arduino/

## Web
1. cp /usr/share/TrafficLigts/000-default /etc/apache2/sites-enabled/000-default
