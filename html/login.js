var socket = io();		    // socket.io instance. Connects back to the server
var button;                 // readings from the server
var input;                  // input field for command arguments
var report;                 // result of command execution


function setup() {
  noCanvas();				// no need for canvas here
  
  dialog = createDiv('In case of network errors check connection from server to any host <br/><strong>Enter IP address:</strong> ');
  
  input = createInput('127.0.0.1');
  input.parent(dialog);
  input.style('width', '150px');
  input.changed(writeData);

  button = createButton('Submit');
  button.parent(dialog);
  button.mousePressed(writeData);

  report = createDiv('');
  report.parent(dialog);
  report.style('width', '550px');
}

// write data to WebSocket
function writeData () {
  data = input.value();
  var html = report.html();
  html = "<li><strong>TX:-->&nbsp;</strong>" + data + html;
  report.html(html);
  socket.emit('login', data);
  
}

// read data from WebSocket
function readData (data) {
  var html = report.html();                                 // save existing report from report div
  html  = "<li><strong>RX:<--&nbsp;</strong><tt><pre>" 
        + data + "</pre></tt></li>" + html;                 // add one more line
  report.html(html);                                        // put back in report div
}

// when new data comes in the websocket, read it:
socket.on('login', readData);
