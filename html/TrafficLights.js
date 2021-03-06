/*
  webSocket client
  context: P5.js

*/

var crossing;               // road Crossing object
var cars;                   // Group of cars
var stopLines;              // Group of stopLines 

var socket = io();		    // socket.io instance. Connects back to the server
var button;                 // readings from the server
var go2login;               // goto login interface

var input;
var report;
var greeting;
var verifyPassword;
var urlParams               // URL params which contain name and password

var capture;                // capture image from attached USB video camera
var trafficLight=[];        // array of Lights constitute Traffic Light
var r1, y1, g1, r2, y2, g2, rp, gp = {};
var arduinoJSON = {};       // parsed JSON from Arduino
var accessLevel = 0;

var girl;
var pedestrianIsle;
var carSound0, carSound1;

function preload() {
  // check name and password
  urlParams = getURLParams();                       // get request from URL parameters
  var username = urlParams.username;                // get username from request
  var password = urlParams.password;                // get password from request
  var hash     = CryptoJS.MD5(password).toString(); // calculate md5 hash of password
  
  if (username === 'worker' && password === '1234') {
    accessLevel = 1;
  } else if (username === 'operator' && hash === '1364cba01e0ee80ef4381175bd6cf0d3') {
    accessLevel = 2;
  } else if (username === 'sysadmin') {
    var data = '{"username":'+username+', "password":'+password+'}';
    console.log('Transmit', data);
    socket.emit('message', data);                   // send password to Arduino controller
    accessLevel = -1;                               // set accessLevel to undefined, while waiting for Arduino reply
  }
  
  console.log('User level=', accessLevel);
  
  if (! accessLevel ) {
    noLoop();
  }

}
/**
 * Function setup is called only once
 */
function setup() {
  var stopLine;             // stopLine
  createCanvas(600, 600);   // set up the canvas
    
  heading = createDiv('');
  heading.position(width+20,10);

  logo = createImg('media/1NTERRUPT.png');
  logo.parent(heading);
  logo.style('height', '100px');
  
  greeting = createDiv();
  greeting.parent(heading);
  var html = 'Welcome <strong>'+urlParams.username+'. </strong>';
  greeting.html(html);
  // html += md5('bebe');

  verifyPassword = createDiv();
  verifyPassword.parent(heading);
  if (accessLevel === 1) {
    html = "Monitoring only.  No I/O with controller allowed";
  } else if (accessLevel === 2) {
    html = "Communication with controller is allowed.  But some restrictions apply";
  } else if (accessLevel === 3) {
    html = "Complete control over controller is allowed.";
  } else if (accessLevel === -1) {
    html = "Verifying password on controller.";
  } else {
    html = "Wrong password, no access allowed"
  }
  verifyPassword.html(html);
  
  dialog = createDiv('');
  dialog.parent(heading);

  input = createInput();
  input.parent(dialog);
  input.style('width', '500px'); 
  //input.changed(writeData);
  
  button = createButton('Submit');
  button.parent(dialog);
  button.mousePressed(writeData);
  
  report = createDiv('');
  report.parent(dialog);
  report.style('width', '550px');
  report.style('font-family', 'monospace');
  if (accessLevel < 2) {
    dialog.style('display', 'none')
  }
  
  // capture image from video camera
  // capture = createCapture(VIDEO);
  
  // create crossing
  crossing = new Crossing(300, 200, 100);

  // create 8 traffic lights  
  var red    = color(255,  0,  0);
  var yellow = color(255,255,  0);
  var green  = color(  0,255,  0);
  
  r1 = new Light(crossing.x+80, crossing.y +80, red,    "R1", 7);
  y1 = new Light(crossing.x+80, crossing.y+125, yellow, "Y1", 6);
  g1 = new Light(crossing.x+80, crossing.y+170, green,  "G1", 5);

  r2 = new Light(crossing.x-80,  crossing.y-80, red,    "R2", 4);
  y2 = new Light(crossing.x-125, crossing.y-80, yellow, "Y2", 3);
  g2 = new Light(crossing.x-170, crossing.y-80, green,  "G2", 2);

  rp = new Light(crossing.x+180, crossing.y-125, red,   "RP", 1);
  gp = new Light(crossing.x+180, crossing.y-80,  green, "GP", 0);

  trafficLight.push(r1);
  trafficLight.push(y1);
  trafficLight.push(g1);
  trafficLight.push(r2);
  trafficLight.push(y2);
  trafficLight.push(g2);
  trafficLight.push(rp);
  trafficLight.push(gp);
  
  // create group of cars
  cars = new Group();
 
  // add 2 Car Spawners for each road - total 4 spawners
  spawners = new Group();
  spawners.push(new CarSpawner(0, 0));
  spawners.push(new CarSpawner(0, 1));
  spawners.push(new CarSpawner(1, 0));
  spawners.push(new CarSpawner(1, 1));
  
  // add 2 stopLines
  stopLines = new Group();
  
  var stopLine = createSprite(crossing.x, 
                              crossing.y + crossing.width/2 + crossing.height/2, 
                              crossing.width, crossing.height );
  stopLine.road = 0;
  stopLine.shapeColor = color(200,200,200);
  stopLine.addToGroup(stopLines);

  var stopLine = createSprite(crossing.x - crossing.width/2 - crossing.height/2, 
                              crossing.y, 
                              crossing.height, crossing.width );
  stopLine.road = 1;
  stopLine.shapeColor = color(200,200,200);
  stopLine.addToGroup(stopLines);

  pedestrianIsle = createSprite(crossing.x + crossing.width + 10, 
                              crossing.y + crossing.width/2 + crossing.height/2, 
                              crossing.height, crossing.height );
  pedestrianIsle.button = false;    // pedestrian Isle button to cross the road is not pressed
  
  // create humans on pedestrian crossing
  girl = createSprite(width-10, crossing.y+crossing.width/2 + 10, 24, 32);

  girl.addAnimation("up",    "media/girl/up-0.png",    "media/girl/up-1.png",   "media/girl/up-2.png", "media/girl/up-1.png");
  girl.addAnimation("left",  "media/girl/left-0.png",  "media/girl/left-1.png", "media/girl/left-2.png", "media/girl/left-1.png");

  girl.changeAnimation("left");
  girl.velocity.x = -0.5;
  girl.velocity.y = -0;
  
  carSound0 = loadSound('media/car0.mp3');
  carSound1 = loadSound('media/car1.mp3');
  carSound0.setVolume(0.7);
  carSound1.setVolume(0.7);
}

/**
 * Crossing definition
 */
var Crossing = function(x, y, w){
  this.x = x;
  this.y = y;
  this.width = w;
  this.height = 20;
  

  // Draw crossing of two roads and pedestrian walk
  this.draw = function(){
    stroke(1);
    fill(255,255,255);
    rect(0, 0, width-1, height-1);
    fill(150,150,150);
    rect (this.x-this.width/2, 0, this.width, height);
    rect (0, this.y-this.width/2, width, this.width);
    noStroke();
    rect (this.x-this.width/2, 0, this.width, height);
    
    // draw pedestrian crossing
    stroke(1);
    fill(255,255,255);
    strokeWeight(1);
    rect (this.x+this.width, this.y-this.width/2, this.width/2, this.width);  
  }
}

/**
 * The special cell that emits new cars
 */
var CarSpawner = function (lane, road) {
  Sprite.call (this, 0, 0, 80, 30);
  this.depth = allSprites.maxDepth()+1;
  this.shapeColor = color(150,150,150);
  allSprites.add(this);

  this.lane = lane;
  this.road = road;
  this.maxSpeed = 2*(this.lane + 1);    // lane 1 runs faster than lane 0
  
  if (this.road === 0) {                // horisontal road
    this.position.x = 0;
    this.position.y = crossing.y - (this.lane - 0.5)* 2 * crossing.width/4;
    this.rotation = 0;
  } else {                              // vertical road
    this.position.x = crossing.x - (this.lane - 0.5)* 2 * crossing.width/4;
    this.position.y = width;
    this.rotation = -90;
  }
}

CarSpawner.prototype = Object.create(Sprite.prototype); 

/**
 * Car
 */ 
var Car = function (spawner) {
  Sprite.call (this, 0, height/2+10, 50, 50);
  this.depth = allSprites.maxDepth()+1;
  //this.debug = true;
  
  var images = ["media/car.png", "media/mini_truck.png", "media/taxi.png", "media/audi.png", "media/mini_van.png"];
  var index  = floor(random(images.length))         // choose random image from the list
  this.addImage(loadImage(images[index]));
  this.scale = 0.25;
  
  this.lane       = spawner.lane;
  this.road       = spawner.road;
  this.spawner    = spawner;
  this.maxSpeed   = spawner.maxSpeed;
  this.position.x = spawner.position.x;
  this.position.y = spawner.position.y;
  this.rotation   = spawner.rotation;

  if (this.road === 0) {          // horisontal road
    this.velocity.x = spawner.maxSpeed;
    this.velocity.y = 0;
  } else {                        // vertical road (can use sine and cosine)
    this.velocity.x = 0;
    this.velocity.y = -spawner.maxSpeed;
  }
  this.addToGroup(cars);
  allSprites.add(this);
}

Car.prototype = Object.create(Sprite.prototype); 

/**
 * Light class - displays one light of Traffic Light 
 */
var Light = function (x, y, colorOn, label, bit) {
  this.diameter = 40;                 // reasonable size of circle
  this.state = 1;                     // turn ON the light by default
  this.x = x;
  this.y = y;
  this.color = colorOn;
  this.label = label;
  this.bit = bit;
    
  this.draw = function(){
    strokeWeight(2);
    if (this.state) {
      fill(this.color);           // light is ON: set the color of light 
    } else {
      var colorOff = color(255,255,255);
      fill(colorOff);             // light if OFF
    }
    // draw Light as a circle filled with color
    stroke(1);
    ellipse(this.x, this.y, this.diameter, this.diameter);

    // draw Light number in the center of the circle
    fill(1);
    noStroke();
    textStyle(NORMAL);
    textAlign(CENTER, CENTER);
    
    textSize(this.diameter/2)
    var msg = this.label.toString();
    text(msg, this.x, this.y);
    msg = this.bit.toString();
    if (this.bit >= 2 && this.bit <=4) {
      text(msg, this.x, this.y - 3/4*this.diameter);      
    } else {
      text(msg, this.x + 3/4*this.diameter, this.y);
    }
  }
}

/**
 * Draw canvas, this function is called 60 times a second
 */
function draw() {
  var i;                                  // loop variable
  var spawner;                            // car spawner
  var car;
  
  background(255);                        // make the screen white
  crossing.draw();                        // draw road crossing

  if (accessLevel <= 0) {                 // do not draw anything to strangers
    return;
  } else if (accessLevel < 2) {
    dialog.style('display', 'none');
  } else {
    dialog.style('display', 'block');
  }

  // Draw all Traffic Lights
  for (i = 0; i < trafficLight.length; i++) {
    light = trafficLight[i];
    light.draw();
  } 

  if (girl.position.y < 10) {             // if girl reaches top of the screen hide it
    girl.visible = false;
  }  
  
  if (!girl.visible && random(0, 3000) < 1) {   // create girl once in 10 seconds or so
    girl.visible = true;
    girl.changeAnimation("left");
    girl.velocity.x = -0.5;
    girl.velocity.y = -0;
    girl.position.x = width-10, 
    girl.position.y = crossing.y+crossing.width/2 + 10;
  }

  // remove cars that left the canvas and unblock all cars
  for (i=0; i < cars.length; i++){
    car = cars[i];
    if (car.position.y < 0 || car.position.y > height || car.position.x <0 || car.position.x > width ) {
      car.remove();
    }
    car.blocked = false;
  }
  
  for (i=0; i < cars.length; i++){
    car = cars[i];
    car.overlap(stopLines, carStopLineCollision);
    car.overlap(cars,      carCollision);
    if (car.overlap(girl)) {
        car.blocked = true;
        car.velocity.x = 0;
        car.velocity.y = 0;
    }
        
    if (! car.blocked ) {
      if (car.road == 0){
        car.velocity.x = car.maxSpeed;
        car.velocity.y = 0;
      } else if (car.road === 1){
        car.velocity.y = -car.maxSpeed;
        car.velocity.x = 0;
      }
    } else {
      car.velocity.x = 0;
      car.velocity.y = 0;
    }
    
  }
  stroke(1);
  text(cars.length, 300, 50);

  // Stop the girl at the crossing

  if (pedestrianIsle.button) {
    pedestrianIsle.shapeColor = "green";  
  } else {
    pedestrianIsle.shapeColor = "red";
  }
  
  if (girl.overlap(pedestrianIsle)) {
    if (!girl.turned) {
      girl.turned = true;
      girl.changeAnimation("up");
      girl.velocity.x = 0;
      girl.velocity.y = 0;
      socket.emit('message', '{"button":1}');   // request green light for pedestrians
      pedestrianIsle.button = true;
    }
    
    if (girl.turned && gp.state) {              // if girl turned towards the road and see green light for pedestrains
      girl.velocity.x = 0;
      girl.velocity.y = -0.7;
    }
  } else {
    girl.turned = false;
  }
  
  drawSprites();

  // plot some information about Traffic Light state
  // text(arduinoJSON.pattern.toString(), 300,300);

  // Try to spawn more cars from all CarSpawners;
  for (i=0; i < spawners.length; i++){
    spawner = spawners[i];
    if (random(0, 100) < 1 &&  ! spawner.overlap(cars) ) {
      car = new Car(spawner);
    }   
  }

}  


/**
 * Collision function between Cars
 */                          
function carCollision(car1, car2) {
  
  // horizontal road car hit horizontal road car from behind
  if (car1.road == 0 && car2.road == 0 && car1.position.x < car2.position.x ) {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
  }
  
  // vertical road
  if (car1.road == 1 && car2.road == 1 && car1.position.y > car2.position.y) {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
  } 

  // horizontal road car hit vertical road car 
  var sep = car1.height/2 + car2.width/2
  if (car1.road == 0 && car2.road == 1 && abs(car1.position.x - car2.position.x + sep) < 5 
      && abs(car2.position.y-car1.position.y)< abs(car2.position.x-car1.position.x) )  {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
    if (! carSound0.isPlaying()) {
       carSound0.play();         
    }
  }
  

  var sep = car1.width/2 + car2.height/2
  // vertical road car hit horisontal road car 
  if (car1.road == 1 && car2.road == 0 && abs(car1.position.y - car2.position.y - sep) < 5
      && abs(car2.position.x-car1.position.x)< abs(car2.position.y-car1.position.y) )  {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
    if (! carSound1.isPlaying()) {
       carSound1.play();         
    }
  }
  
}

/**
 * Collision function between Car and Stop Line
 */                          
function carStopLineCollision(car, stopLine) {
    
  // cars on horizontal road hit traffic light Stop Line
  if (car.road === 0 && ! car.blocked) {      // horisontal road
    if (! g2.state && car.position.x + car.height/2 < stopLine.position.x) { 
      car.velocity.x = 0;
      car.blocked = true;
    } else {                                  // if car already passed the crossing
      car.velocity.x = car.maxSpeed;
      car.blocked = false;
    }
  }
  
  // cars on vertical road hit traffic light Stop Line
  if (car.road === 1 && ! car.blocked) {      // vertical road
    if (! g1.state && car.position.y - car.height/2 > stopLine.position.y) { 
      car.velocity.y = 0;
      car.blocked = true;
    } else {                                  // if car passed the crossing
      car.velocity.y = -car.maxSpeed;
      car.blocked = false;
    }
  }
}

/**
 * Write data to Arduino through Serial port
 */
function writeData () {
  data = input.value();
  var html = report.html();
  html = "<li><strong>TX:-->&nbsp;</strong>" + data + html;
  report.html(html);
  socket.emit('message', data);
  
}

/**
 * Read data from Arduino through Serial port
 */
function readData (data) {
  var FLAG_GP = 0x01; // 0000 0001
  var FLAG_RP = 0x02; // 0000 0010
  var FLAG_G2 = 0x04; // 0000 0100
  var FLAG_Y2 = 0x08; // 0000 1000
  var FLAG_R2 = 0x10; // 0001 0000
  var FLAG_G1 = 0x20; // 0010 0000
  var FLAG_Y1 = 0x40; // 0100 0000
  var FLAG_R1 = 0x80; // 1000 0000

  var html = report.html();                                 // save existing report from report div
  html = "<li><strong>RX:<--&nbsp;</strong>" + data + html; // add one more line
  report.html(html);                                        // put back in report div

  try {
    arduinoJSON  = JSON.parse(data);
    rp.prev  = rp.state;
    gp.prev  = gp.state;
    
    r1.state = arduinoJSON.pattern & FLAG_R1;
    y1.state = arduinoJSON.pattern & FLAG_Y1;
    g1.state = arduinoJSON.pattern & FLAG_G1;
    r2.state = arduinoJSON.pattern & FLAG_R2;
    y2.state = arduinoJSON.pattern & FLAG_Y2;
    g2.state = arduinoJSON.pattern & FLAG_G2;
    rp.state = arduinoJSON.pattern & FLAG_RP;
    gp.state = arduinoJSON.pattern & FLAG_GP;
    
    if (gp.prev && rp.state) {                                // if pedestrian light turned from green to red
      pedestrianIsle.button = false;                          // release pedestrian button
    }
  } catch(err) {                                              // if it is not JSON format and parsing fails
    console.log("Not JSON:", data);
    if (data.indexOf("Login success") > -1) {
        accessLevel = 3;
        console.log("Login success");
        verifyPassword.html("Complete control over controller is allowed.");
    } else if (data.indexOf("Login failure") > -1) {
        accessLevel = 0;
        console.log("Login failure");
        verifyPassword.html("Wrong password, no access allowed");
    }
  }
}

// when new data comes in the websocket, read it:
socket.on('message', readData);
