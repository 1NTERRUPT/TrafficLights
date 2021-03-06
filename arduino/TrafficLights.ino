#include <TimerOne.h>
#include <ArduinoJson.h>

#define POLARITY 0  // polarity of Arduino signal (which signal turns LED on)
                    // if POLARITY=1 then HIGH voltage turns Light ON
                    //                    LOW  voltage turns Light OFF
                    //
                    // if POLARITY=0 then HIGH voltage turns Light OFF
                    //                    LOW  voltage turns Light ON

// schematics of how LEDs are attached to Arduino
// Attention in this particular setup HIGH - turns led OFF, LOW - turns led ON
//
int ledRP =  3;     // RED    light for pedestrian crossing
int ledGP =  4;     // GREEN  light for pedestrian crossing
int ledR1 =  5;     // RED    light for direction 1
int ledY1 =  6;     // YELLOW light for direction 1
int ledG1 =  7;     // GREEN  light for direction 1
int ledR2 =  8;     // RED    light for direction 2
int ledY2 =  9;     // YELLOW light for direction 2
int ledG2 = 10;     // GREEN  light for direction 2
int stateTL = 0;    // current state of Traffic Light State Machine 

// LED light pattern is represented by bits 1 - light is ON, 0 - light is OFF
/*
Bits for Lights Pattern
bit7 bit6 bit5 bit4 bit3 bit2 bit1 bit0
 R1   Y1   G1   R2   Y2   G2   RP   GP
*/
int lightPinsBits [][2] = {
    {ledR1, 7},     // R1 - bit 7 
    {ledY1, 6},     // Y1 - bit 6
    {ledG1, 5},     // G1 - bit 5
    {ledR2, 4},     // R2 - bit 4
    {ledY2, 3},     // Y2 - bit 3
    {ledG2, 2},     // G2 - bit 2
    {ledRP, 1},     // RP - bit 1
    {ledGP, 0}      // GP - bit 0
};
int nlightPins = 8;

// set of light sequences (need to rename variable)
unsigned int lightPatternsAll[][3] = {  
    // light pattern and delay how long it should stay in ms
    {B00110010, 4000, 1},   // 0    R2G1
    {B01010010, 2000, 2},   // 1    R2Y1
    {B10010010, 1000, 3},   // 2    R2R1
    {B10000110, 4000, 4},   // 3    G2R1
    {B10001010, 2000, 5},   // 4    Y2R1
    {B10010010, 1000, 0},   // 5    R2R1
    // pedestrians cross the street - added to normal RYG sequence
    {B10010010, 1000, 7},   // 6    again close all directions
    {B10010001, 3000, 8},   // 7    again close all directions
    {B10010010, 1000, 0},   // 8    again close all directions
    // failed state - blinking yellow sequence
    {B01001000, 1000,10},   // 9    blinking yellow sequence
    {B00000000, 1000, 9}    //10
};
int nlightPatternsAll = sizeof(lightPatternsAll)/sizeof(unsigned int)/3;

// where in sequence arrays different programs are located
# define NORMAL_RYG_BEGIN       0
# define NORMAL_RYG_END         5
# define PEDESTRIANS_BEGIN      6
# define PEDESTRIANS_END        8
# define BLINKING_YELLOW_BEGIN  9
# define BLINKING_YELLOW_END    10

int ledPinState = 0;
volatile boolean pressed = false;
volatile boolean timerUp = false;

String inputString = "";            // a string to hold incoming data from Serial port
boolean stringComplete = false;     // whether the string is complete
boolean failedState = false;        // emergency - turn lights in failed state blinking Yellow
boolean pedestrianRequest = false;  // pedestrians request crossing the road
boolean pedestrianCrossed = false;  // pedestrinas crossed the road
boolean guardEnabled = true;        // enable MMU guard check of trafic light system
long nguard = 0;
int accessLevel = 0;                // user permissions level

/*
ISR routine to process button pressed
*/
void button() {
    // when button is pressed  the Pin2 voltage = 0.14V
    // when button is released the Pin2 voltage = 4.85V
    pressed = true;
}

/*
ISR routine to process Timer interrupt
*/
void timerIsr()
{
    timerUp = true;
}

/*
Helper function to read Serial port and add characters to inputString
signal with logical varaiable stringComplete that string is ready for further processing 
*/
void serialEvent() {
  while (Serial.available()) {
    char inChar = (char)Serial.read();
    inputString += inChar;
    if (inChar == '\n' || inChar == '\r') {
      stringComplete = true;
    }
  }
  
}

/**
 * Malfunction Management Unit
 *
 * Checks that apparatus is working correctly and LED voltages correspond to current 
 * state of Traffic Light.  
 * 
 * If the current state pattern differs from what one could expect it switches apparatus to
 * emergency state with flashing Yellow light.
 *
 * Processing of this check takes less than 0.1ms
 */
boolean guard(int state) {
  // read LEDs voltages and verify corresponding bit pattern
  unsigned int lightPattern = 0;
  for (int i=0; i < nlightPins; i++) {        // for each LED available
    int pin   = lightPinsBits[i][0];          // pin where LED is connected
    int bit   = lightPinsBits[i][1];          // bit in corresponding pattern
    int value;                                // value of light state 1=ON, 0=OFF
    if (POLARITY == 1) {                      // normal polarity
      value = digitalRead(pin);               // check the state of light ON/OFF
    } else {                                  // reverse polarity
      value = 1 - digitalRead(pin);           // check the state of light ON/OFF
    }
    bitWrite(lightPattern, bit, value);       // write bit in the pattern
  }
        
  boolean emergency = true;
  if (lightPatternsAll[state][0] == lightPattern) {
    emergency = false;
  }
  nguard++;
  if (nguard % 1000000 == 0) {
    Serial.print ("Number of guard calls reached = ");
    Serial.println (nguard);
  }
  return emergency;            
}

/**
 * helper function that turns lights ON/OFF for a particular sequence number "state"
 */
void lights(int state) {
  unsigned int  pattern = lightPatternsAll[state][0];
  unsigned long delay   = lightPatternsAll[state][1];
  // Setup JSON communication
  StaticJsonBuffer<100> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
        
  // Prepare JSON output    
  root["state"] = state;
  root["delay"] = delay;
  root["pattern"] = pattern;
  root["accessLevel"] = accessLevel;
    
  root.printTo(Serial);
  Serial.println();
  // Serial.println(pattern, BIN);

  for (int i=0; i < nlightPins; i++) {        // for each LED available
    int pin   = lightPinsBits[i][0];          // pin where LED is connected
    int bit   = lightPinsBits[i][1];          // bit in corresponding pattern
    int value = bitRead(pattern, bit);        // check the state of light ON/OFF
 
    if (POLARITY == 1) {                      // normal polarity
      digitalWrite(pin, value);               // turn the LED ON/OFF normal polarity
    } else {                                  // reverse polarity
      digitalWrite(pin, 1 - value);           // turn the LED ON/OFF reverse polarity
    }
        
  }
  Timer1.initialize(delay*1000);              // set light duration (in microseconds)
}
 
/**
 * helper function that reads lights
 */
void readLights() {
  // read LEDs voltages and verify corresponding bit pattern
  unsigned int lightPattern = 0;
  for (int i=0; i < nlightPins; i++) {      // for each LED available
    int pin   = lightPinsBits[i][0];        // pin where LED is connected
    int bit   = lightPinsBits[i][1];        // bit in corresponding pattern
    int value;                              // value of light state 1=ON, 0=OFF
    if (POLARITY == 1) {                    // normal polarity
      value = digitalRead(pin);             // check the state of light ON/OFF
    } else {                                // reverse polarity
      value = 1 - digitalRead(pin);         // check the state of light ON/OFF reverse polarity
    }
    bitWrite(lightPattern, bit, value);     // write bit in the pattern
  }

  // Setup JSON communication
  StaticJsonBuffer<100> jsonBuffer;
  JsonObject& root = jsonBuffer.createObject();
        
  // Prepare JSON output    
  root["state"] = stateTL;
  root["delay"] = 0;
  root["pattern"] = lightPattern;
    
  root.printTo(Serial);
  Serial.println();
}


/**
 * Mandatory Arduino initialization stage.  It runs once.
 */
void setup() {
  // Initialize pins attached to lights LEDs
  for (int i=0; i < nlightPins; i++) {      // for each LED available
    int pin   = lightPinsBits[i][0];        // pin where LED is connected
    pinMode(pin, OUTPUT);                   // set output mode
  }
  lights(NORMAL_RYG_BEGIN);                 // set Traffic Light in initial condition

  pinMode(2, INPUT);                        // button is attached to pin2
  digitalWrite(2,HIGH);                     // attach pull-up resistor
  attachInterrupt(0, button, FALLING);      // set ISR to process button press events
    
  // use timerIsr to process timer interrupts
  Timer1.attachInterrupt( timerIsr );       // set ISR to process timer events
    
  // reserve enough room for Serial commands
  inputString.reserve(200);
    
  // start Serial communication
  Serial.begin(115200);                     // set up Serial library at 115200 bps
  Serial.println("--------------- Serial Start ------------------");    
}

/**
 *
 * Main Arduino loop
 *
 */
void loop() {

  /* Pedestrians pressed button to request road crossing */
  if (pressed) {
    pressed = false;
    pedestrianRequest = true;       // pedestrians requested crossing 
    pedestrianCrossed = false;      // but did not crossed the road yet
    delay(100);                     // take jitter out (push-button electronics effect)
    // change sequence to let pedestrians in
    Serial.println("Button pressed: Let pedestrians in");
    lightPatternsAll[NORMAL_RYG_END][2] = PEDESTRIANS_BEGIN; // attach pedestrian crossing to main RYG sequence
  }

  /* Timer is UP, switch the traffic lights */
  if (timerUp) {
    timerUp = false;

    if (stateTL == PEDESTRIANS_END && !pedestrianRequest) {       // Pedestrians Crossed
                                                                  // and no one pressed the button again
      pedestrianCrossed = true;                                   // Reset the flag
      lightPatternsAll [NORMAL_RYG_END][2] = NORMAL_RYG_BEGIN;    // switch back to normal RYG sequence
    }     
    // read next state from sequence
    stateTL = lightPatternsAll[stateTL][2];
    lights (stateTL);
    if (stateTL == PEDESTRIANS_BEGIN) {                           // Traffic light switched to Pedestrian sequence
      pedestrianRequest = false;                                  // clear the Pedestrian request flag
    }     

  }

/**
 * Check data from serial port and parse information
 */
  serialEvent(); 
  if (stringComplete) {
    // Setup JSON communication
    StaticJsonBuffer<100> jsonBuffer1;
    JsonObject& inputJson = jsonBuffer1.parseObject(inputString);

    if (!inputJson.success()) {
      Serial.print("Arduino: parseObject() failed. inputString = ");
      Serial.println(inputString);
    
    } else {
                
      if (inputJson.containsKey("turnON")) {
        int lightON = inputJson["turnON"];        // bit corresponding to light
        for (int i=0; i < nlightPins; i++) {      // for each LED available
          int pin   = lightPinsBits[i][0];        // pin where LED is connected
          int bit   = lightPinsBits[i][1];        // bit in corresponding pattern
          if (bit == lightON) {
            if (POLARITY == 1) {                    
              digitalWrite(pin, HIGH);            // turn the LED ON normal polarity
            } else {
              digitalWrite(pin, LOW);             // turn the LED ON reverse polarity
            }
          }
        }
      }
                
      if (inputJson.containsKey("turnOFF")) {
        int lightOFF = inputJson["turnOFF"];
        for (int i=0; i < nlightPins; i++) {      // for each LED available
          int pin   = lightPinsBits[i][0];        // pin where LED is connected
          int bit   = lightPinsBits[i][1];        // bit in corresponding pattern
          if (bit == lightOFF) {
            if (POLARITY == 1) {                    
              digitalWrite(pin, LOW);                // turn the LED OFF normal polarity
            } else {
              digitalWrite(pin, HIGH);               // turn the LED OFF reverse polarity
            }
          }
        }
      }

      if (inputJson.containsKey("button")) {
        if (inputJson["button"]) {
          pressed = true;
        } else {
          pressed = false;  
        }        
      }

      if (inputJson.containsKey("guard")) {
        if (accessLevel == 3) {
          guardEnabled = inputJson["guard"];
        } else {
          Serial.println("Access Denied, you do not have enough priveleges");
        }
          
      }

      if (inputJson.containsKey("password")) {
        int password = inputJson["password"];
        if (password == 7) {
            accessLevel = 3;
            Serial.println("Login success. SysAdmin priveleges GRANTED.");
        } else {
            accessLevel = 0;
            Serial.println("Login failure. Wrong password.");
        }
        
      }          

      // print available information
      if (inputJson.containsKey("info") && inputJson["info"] > 0) {
        Serial.print("Your accessLevel = ");
        Serial.println(accessLevel);
        Serial.print("MMU state is = ");
        Serial.println(guardEnabled);
        Serial.println("Program in Controller:");
        for (int i=nlightPatternsAll-1; i>=0; i--) {         // for each lightPattern
          unsigned int lightPattern = lightPatternsAll[i][0];
          unsigned int        delay = lightPatternsAll[i][1];
          unsigned int    nextState = lightPatternsAll[i][2];
          Serial.print("state = ");
          Serial.print(i);
          Serial.print(" delay = ");
          Serial.print(delay);
          Serial.print(" pattern = ");
          Serial.print(lightPattern);
          Serial.print(" nextState = ");
          Serial.println(nextState);
        }  
      }

      if (inputJson.containsKey("set")    && 
                  inputJson["set"] > 0    && 
          inputJson.containsKey("state")  && 
          inputJson.containsKey("delay")     ) {
        int state = inputJson["state"];
        int delay = inputJson["delay"];
        if (state >= 0 && state < nlightPatternsAll) {
          lightPatternsAll[state][1] = delay;
        }
      }

      if (inputJson.containsKey("set")    && 
                  inputJson["set"] > 0    && 
          inputJson.containsKey("state")  && 
          inputJson.containsKey("pattern")   ) {
          
        if (accessLevel >= 3){
          int state   = inputJson["state"];
          int pattern = inputJson["pattern"];
          if (state >= 0 && state < nlightPatternsAll) {
            lightPatternsAll[state][0] = pattern;
          }
        } else {
          Serial.println("Light pattern can be changed only by sysadmin");
        }
      }

      if (failedState && inputJson.containsKey("reset") && inputJson["reset"] > 0) {
        if (accessLevel == 3) {
          failedState = false;
          stateTL = NORMAL_RYG_BEGIN;         // Reset global State of Traffic light to Normal RYG
          lights(stateTL);                    // Start normal RYG sequence
        } else {
          Serial.println("Access Denied, you do not have enough priveleges");        
        }
      } 

      readLights();
    }
       
    delay(400);
    inputString = "";
    stringComplete = false;
  }
    
  // check for forbidden states
  if (guardEnabled && !failedState && guard(stateTL)) {
    Serial.println("---- EMERGENCY-----");
    failedState = true;
    stateTL = BLINKING_YELLOW_BEGIN;        // Start Blinking Yellow sequence
    lights(stateTL);
  }
    
}


