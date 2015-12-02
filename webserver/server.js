
/*
Serial to Socket.io example

Shows how to make a basic webSocket connection between a client and a server
using Socket.io version 1.0 or later (http://socket.io/)
To run it from the command line:
node server.js serialport

where serialport is the name of your serial port.

based on code by Tom Igoe
*/

// server initialization:
var express = require('express');		            // include express.js
	io = require('socket.io'),				        // include socket.io
	app = express(),						        // make an instance of express.js
 	server = app.listen(8080),				        // start a server with the express instance
	socketServer = io(server);	 			        // make a socket server using the express server

// serial port initialization:
var serialport = require('serialport'),			    // include the serialport library
	SerialPort  = serialport.SerialPort,			// make a local instance of serial
	portName = process.argv[2],						// get the port name from the command line
	portConfig = {
		baudRate: 115200,
		// call myPort.on('data') when a newline is received:
		parser: serialport.parsers.readline('\n')
	};

// open the serial port:
var myPort = new SerialPort(portName, portConfig);

// crypto initializaion
var crypto = require('crypto-js');


//  set up server and socketServer listener functions:
app.use(express.static('..'));					    // serve files from the public folder
app.get('/:name', serveFiles);						// listener for all static file requests
var favicon = require('serve-favicon');
app.use(favicon(__dirname + '/media/favicon.ico'));

//app.use(favicon(path.join(__dirname,'WebServer','media','favicon.ico')));


socketServer.on('connection', openSocket);	        // listener for websocket data

function serveFiles(request, response) {
	var fileName = request.params.name;				// get the file name from the request
	response.sendFile(fileName);					// send the file
}

var exec = require('child_process').exec,
    child;


function openSocket(socket){
	console.log('new user address: ' + socket.handshake.address);
	// send something to the web client with the data:
	socket.emit('message', 'Hello, ' + socket.handshake.address);

	// this function runs if there's input from the client:
	socket.on('message', function(data) {
	    console.log('Got message from socket', data);
		myPort.write(data);					        // send the data to the serial device
		myPort.write("\n");
	});

	// this function runs if there's input from the client:
	socket.on('login', function(data) {
    command = "ping -c1 172.27.253." + data;
    child = exec(command,
      function (error, stdout, stderr) {
        socket.emit('login', '<font color="darkgreen"> Result OK: </font>' + stdout);
        //console.log('stdout: ' + stdout);
        //console.log('stderr: ' + stderr);
        if (error !== null) {
          //console.log('exec error: ' + error);
          socket.emit('login', '<font color="darkred">Result ERR:</font>' + error);
          //socket.emit('login', 'Result ERR: ' + stderr);
        }
    });


	});

	// this function runs if there's input from the serialport:
	myPort.on('data', function(data) {
		socket.emit('message', data);		        // send the data to the client
	});
}
