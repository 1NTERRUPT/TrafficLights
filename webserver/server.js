/*
To run it from the command line:
node server.js serialport
where serialport is the name of your serial port.

based on code by Tom Igoe
*/

// server initialization:
var express = require('express'),		            // include express.js
	io = require('socket.io'),				        // include socket.io
	app = express(),						        // make an instance of express.js
 	server = app.listen(8080),		                // start a server with the express instance
	socketServer = io(server);	 			        // make a socket server using the express server

// serial port initialization:
var serialport = require('serialport'),			    // include the serialport library
	SerialPort = serialport.SerialPort,	            // make a local instance of serial
	portName = process.argv[2],		                // get the port name from the command line
	portConfig = {
		baudRate: 115200,
		// call myPort.on('data') when a newline is received:
		parser: serialport.parsers.readline('\n')
	};

// open the serial port:
var myPort = new SerialPort(portName, portConfig);

// crypto initializaion (perhaps in the future)
// var crypto = require('crypto-js');


//  set up server and socketServer listener functions:
app.use(express.static('../html'));		            // DocumentRoot where html files are located

app.get('/:name', serveFiles);						// listener for all static file requests
//var favicon = require('serve-favicon');
//app.use(favicon('/media/favicon.ico'));             // favicon.ico filr

//app.use(favicon(path.join('media','favicon.ico')));


socketServer.on('connection', openSocket);	        // listener for websocket data

function serveFiles(request, response) {
	var fileName = request.params.name;				    // get the file name from the request
	response.sendFile(fileName, { root: __dirname });   // send the file
}

var exec = require('child_process').exec,
    child;


function openSocket(socket){
	console.log('new user address: ' + socket.handshake.address);
	// send something to the web client with the data:
	socket.emit('message', 'Hello, ' + socket.handshake.address);
	socket.emit('message', '<strong> Command syntax </strong> \n' +
                '<br/> {turnON:1, turnOFF:3} - turn On Light 1, and turn Off Light 3 \n' +
                '<br/> {guard:1} - Enable  Malfunction Management Unit \n' +
                '<br/> {guard:0} - Disable Malfunction Management Unit \n' +
                '<br/> {reset:1} - reset Traffic Light if it enteres Malfunction State (yellow blinking) \n' +
                '<br/> {button:1} - request Pedestrain Crossing'
                );

	// this function runs if there's input from the client:
	socket.on('message', function(data) {
	    console.log('Got message from socket', data);
		myPort.write(data);					        // send the data to the serial device
		myPort.write("\n");
	});

	// this function runs if there's input from the client:
	socket.on('login', function(data) {
    command = "ping -c1 " + data;
    child = exec(command,
      function (error, stdout, stderr) {
        socket.emit('login', '<font color="darkgreen"> Result OK: </font>' + stdout);
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (error !== null) {
          //console.log('exec error: ' + error);
          socket.emit('login', '<font color="darkred">Result ERR:</font>' + error);
        }
    });
	});

	// this function runs if there's input from the serialport:
	myPort.on('data', function(data) {
	    console.log('Got message from Serial port:', data);
		socket.emit('message', data);		        // send the data to the client
	});
}
