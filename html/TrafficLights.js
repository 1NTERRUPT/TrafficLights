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
var urlParams               // URL params which contain name and password

var capture;                // capture image from attached USB video camera
var trafficLight=[];        // array of Lights constitute Traffic Light
var r1, y1, g1, r2, y2, g2, rp, gp = {};
var accessLevel = 0;

var girl;
var pedestrianIsle;

function preload() {
  // check name and password
  urlParams = getURLParams();                       // get request from URL parameters
  var username = urlParams.username;                // get username from request
  var password = urlParams.password;                // get password from request
  var hash     = CryptoJS.MD5(password).toString(); // calculate md5 hash of password
  
  if (username === 'worker' && password === '134565') {
    accessLevel = 1;
  } else if (username === 'operator' && hash === '1364cba01e0ee80ef4381175bd6cf0d3') {
    accessLevel = 2;
  } else if (username === 'sysadmin') {
    var data = '{"username":'+username+', "password":'+password+'}';
    console.log('Transmit', data);
    socket.emit('message', data);                   // send password to Arduino controller
    accessLevel = 3;    
  }
  
  console.log('User level=', accessLevel);
  
  if (! accessLevel ) {
    noLoop();
    //remove();
  }
  
}

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
  var html = 'Welcome <strong>'+urlParams.username+'</strong>';
  // html += md5('bebe');
  if (accessLevel === 1) {
    html += ", Monitoring only.  No I/O with controller allowed";
  } else if (accessLevel === 2) {
    html += ", Communication with controller is allowed.  Some restrictions apply";
  }
  greeting.html(html);
  

  
  dialog = createDiv('');
  dialog.position(width+20, 130);

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
  if (accessLevel < 2) {
    dialog.style('display', 'none')
  }
  
  // capture image from video camera
  capture = createCapture(VIDEO);
  
  // create crossing
  crossing = new Crossing(300, 200, 100);

  // create 8 traffic lights  
  var red    = color(255,  0,  0);
  var yellow = color(255,255,  0);
  var green  = color(  0,255,  0);
  
  r1 = new Light(crossing.x+80, crossing.y +80, red,    0);
  y1 = new Light(crossing.x+80, crossing.y+125, yellow, 1);
  g1 = new Light(crossing.x+80, crossing.y+170, green,  2);

  r2 = new Light(crossing.x-80,  crossing.y-80, red,    3);
  y2 = new Light(crossing.x-125, crossing.y-80, yellow, 4);
  g2 = new Light(crossing.x-170, crossing.y-80, green,  5);

  rp = new Light(crossing.x+180, crossing.y-125, red,    6);
  gp = new Light(crossing.x+180, crossing.y-80,  green,  7);

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
  stopLine.addToGroup(stopLines);

  var stopLine = createSprite(crossing.x - crossing.width/2 - crossing.height/2, 
                              crossing.y, 
                              crossing.height, crossing.width );
  stopLine.road = 1;
  stopLine.addToGroup(stopLines);

  pedestrianIsle = createSprite(crossing.x + crossing.width + 10, 
                              crossing.y + crossing.width/2 + crossing.height/2, 
                              crossing.height, crossing.height );
  pedestrianIsle.button = false;    // pedestrian Isle button to cross the road is not pressed
  
  //mySound.setVolume(0.7);

  // create humans on pedestrian crossing
  girl = createSprite(width-10, crossing.y+crossing.width/2, 24, 32);

  /*
  // create girls animation using Sprite Sheets.  For some reason collisions do not work.
  var left_frames = [
    {"name":"left_1", "frame":{"x": 0,  "y":96, "width": 24, "height": 32}},
    {"name":"left_2", "frame":{"x":24,  "y":96, "width": 24, "height": 32}},
    {"name":"left_3", "frame":{"x":48,  "y":96, "width": 24, "height": 32}},
    {"name":"left_4", "frame":{"x":24,  "y":96, "width": 24, "height": 32}}
  ];
  var up_frames = [
    {"name":"up_1",   "frame":{"x":0,   "y": 0, "width": 24, "height": 32}},
    {"name":"up_2",   "frame":{"x":24,  "y": 0, "width": 24, "height": 32}},
    {"name":"up_3",   "frame":{"x":48,  "y": 0, "width": 24, "height": 32}},
    {"name":"up_4",   "frame":{"x":24,  "y": 0, "width": 24, "height": 32}}
  ];
  girl_left_sprite_sheet = loadSpriteSheet('media/Townfolk-Adult-F-003.png', left_frames);
  girl_up_sprite_sheet   = loadSpriteSheet('media/Townfolk-Adult-F-003.png',   up_frames);
  girl.addAnimation("left", loadAnimation(girl_left_sprite_sheet));
  girl.addAnimation("up",   loadAnimation(  girl_up_sprite_sheet));
   
  */

  girl.addAnimation("up",    "media/girl/up-0.png",    "media/girl/up-1.png",   "media/girl/up-2.png", "media/girl/up-1.png");
  girl.addAnimation("left",  "media/girl/left-0.png",  "media/girl/left-1.png", "media/girl/left-2.png", "media/girl/left-1.png");

  girl.changeAnimation("left");
  girl.velocity.x = -0.5;
  girl.velocity.y = -0;
  
}

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

var CarSpawner = function (lane, road) {
  Sprite.call (this, 0, 0, 80, 30);
  this.depth = allSprites.maxDepth()+1;
  allSprites.add(this);

  this.lane = lane;
  this.road = road;
  this.debug = 1;
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

//  Light class - displays one light of Traffic Light 
var Light = function (x, y, colorOn, bit) {
  this.diameter = 40;                 // reasonable size of circle
  this.state = 1;                     // turn ON the light by default
  this.x = x;
  this.y = y;
  this.color = colorOn;
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
    var msg = this.bit.toString();
    text(msg, this.x, this.y);
  }
}


function draw() {
  var i;                                  // loop variable
  var spawner;                            // car spawner
  var car;
  
  background(255);                        // make the screen white
  crossing.draw();                        // draw road crossing

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
    girl.position.y = crossing.y+crossing.width/2;
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
    if (car.overlap(stopLines, carStopLineCollision) ) {
    } else if (car.overlap(cars,carCollision)) {
      
    } else { 
      if(car.road === 0){ 
        car.velocity.y = -car.maxSpeed;
        car.velocity.x = 0;
      } else {
        car.velocity.x = car.maxSpeed;
        car.velocity.y = 0;
      }
    }
        
    if (! car.blocked ) {
      if (car.road === 0){
        car.velocity.x = car.maxSpeed;
        car.velocity.y = 0;
      } else if (car.road === 1){
        car.velocity.y = -car.maxSpeed;
        car.velocity.x = 0;
      }
    } else {
      car.velocity.x = 0;
      car.velocity.y = 0;
      if (car.road === 0 && g2 || car.road === 0 && g1) {
        //if (! mySound.isPlaying) {
        //  mySound.play();         
        //}
      }
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

  // Try to spawn more cars from all CarSpawners;
  for (i=0; i < spawners.length; i++){
    spawner = spawners[i];
    if (random(0, 100) < 1 &&  ! spawner.overlap(cars) ) {
      car = new Car(spawner);
    }   
  }

}  


/**
*
* Collision function between Cars
*
*/                          
function carCollision(car1, car2) {
  
  if (car1.road == 0 && car1.position.x < car2.position.x 
      && abs(car2.position.y-car1.position.y)<(car1.height/2+car2.width/2)*car1.scale )  {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
  }
  
  if (car1.road === 1 && car1.position.y > car2.position.y 
      && abs(car2.position.x-car1.position.x)<(car1.height/2+car2.width/2)*car1.scale )  {
    car1.velocity.x = 0;
    car1.velocity.y = 0;
    car1.blocked = true;
  } 
  
}

/**
*
* Collision function between Car and Stop Line
*
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

/*
 * Write data to Arduino through Serial port
 */
function writeData () {
  data = input.value();
  var html = report.html();
  html = "<li><strong>TX:-->&nbsp;</strong>" + data + html;
  report.html(html);
  socket.emit('message', data);
  
}

/*
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
    var obj = JSON.parse(data);
    rp.prev  = rp.state;
    gp.prev  = gp.state;
    
    r1.state = obj.pattern & FLAG_R1;
    y1.state = obj.pattern & FLAG_Y1;
    g1.state = obj.pattern & FLAG_G1;
    r2.state = obj.pattern & FLAG_R2;
    y2.state = obj.pattern & FLAG_Y2;
    g2.state = obj.pattern & FLAG_G2;
    rp.state = obj.pattern & FLAG_RP;
    gp.state = obj.pattern & FLAG_GP;
    
    if (gp.prev && rp.state) {                                // if pedestrian light turned from green to red
      pedestrianIsle.button = false;                          // release pedestrian button
    }
  } catch(err) {
    //console.log("BAD!!!");
  }
}

// when new data comes in the websocket, read it:
socket.on('message', readData);
