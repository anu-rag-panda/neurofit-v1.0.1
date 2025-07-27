/*
Mind and Health Tracker Device - Hardware Overview

Components:
- Seed Studio Xiao nRF52840: Main microcontroller for sensor management and BLE communication.
- BioAmp EXG Pill: Captures brain wave signals (EEG) for mental state analysis.
- MAX30102 Pulse Oximeter: Measures heart rate and SpO2 for physical health monitoring.
- Vibration Motor: Provides haptic feedback for alerts and meditation prompts.

Functionality:
- Collects brain wave, heart rate, and SpO2 data in real-time.
- Transmits sensor data via Bluetooth Low Energy (BLE) to the web application.
- Triggers vibration feedback for abnormal readings or meditation sessions.
- Supports emergency detection (e.g., irregular signals, falls) for alerting contacts.

Created By - Anurag Panda (Durgapur,India) on 27/07/2025
*/
#include <Arduino.h>
#include <bluefruit.h>
#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include <Arduino_LSM6DS3.h> // Add IMU library

// Pin definitions
#define BIOAMP_PIN A0
#define VIBRATION_PIN D2

MAX30105 particleSensor;

// BLE Service and Characteristics
BLEService healthService("180D");
BLECharacteristic brainwaveChar("2A37", BLERead | BLENotify);
BLECharacteristic heartRateChar("2A38", BLERead | BLENotify);
BLECharacteristic spo2Char("2A39", BLERead | BLENotify);

void setup() {
  Serial.begin(115200);
  pinMode(BIOAMP_PIN, INPUT);
  pinMode(VIBRATION_PIN, OUTPUT);
  digitalWrite(VIBRATION_PIN, LOW);

  // Initialize MAX30102
  Wire.begin();
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("MAX30102 not found. Check wiring.");
    while (1);
  }
  particleSensor.setup(); // Use default settings

  // Initialize BLE
  if (!Bluefruit.begin()) {
    Serial.println("BLE init failed");
    while (1);
  }
  Bluefruit.setLocalName("NeuroFit");
  Bluefruit.setAdvertisedService(healthService);
  healthService.addCharacteristic(brainwaveChar);
  healthService.addCharacteristic(heartRateChar);
  healthService.addCharacteristic(spo2Char);
  Bluefruit.addService(healthService);
  Bluefruit.advertise();
  Serial.println("BLE device active, waiting for connections...");

  // Initialize IMU
  if (!IMU.begin()) {
    Serial.println("Failed to initialize IMU!");
    while (1);
  }
}

// Simple IIR bandpass filter variables for brainwave (Alpha band example)
float filteredBrainwave = 0;
const float alpha = 0.1; // filter coefficient, adjust for desired response

// Filter coefficients for each band (adjust for your sampling rate)
const float alphaDelta = 0.02; // Delta: 0.5-4 Hz
const float alphaTheta = 0.04; // Theta: 4-8 Hz
const float alphaAlpha = 0.1;  // Alpha: 8-12 Hz
const float alphaBeta  = 0.15; // Beta: 12-30 Hz
const float alphaGamma = 0.2;  // Gamma: 30-100 Hz

float filteredDelta = 0;
float filteredTheta = 0;
float filteredAlpha = 0;
float filteredBeta  = 0;
float filteredGamma = 0;

// For high-pass stage
static float hpPrevDelta = 0, hpOutPrevDelta = 0;
static float hpPrevTheta = 0, hpOutPrevTheta = 0;
static float hpPrevAlpha = 0, hpOutPrevAlpha = 0;
static float hpPrevBeta  = 0, hpOutPrevBeta  = 0;
static float hpPrevGamma = 0, hpOutPrevGamma = 0;

unsigned long lastBeat = 0;

void loop() {
  BLE.poll();

  // Read BioAmp EXG Pill (brainwave analog value)
  float brainwave = analogRead(BIOAMP_PIN);

  // Delta band (0.5-4 Hz)
  float hpOutDelta = alphaDelta * (hpOutPrevDelta + brainwave - hpPrevDelta);
  hpPrevDelta = brainwave;
  hpOutPrevDelta = hpOutDelta;
  filteredDelta = filteredDelta + alphaDelta * (hpOutDelta - filteredDelta);

  // Theta band (4-8 Hz)
  float hpOutTheta = alphaTheta * (hpOutPrevTheta + brainwave - hpPrevTheta);
  hpPrevTheta = brainwave;
  hpOutPrevTheta = hpOutTheta;
  filteredTheta = filteredTheta + alphaTheta * (hpOutTheta - filteredTheta);

  // Alpha band (8-12 Hz)
  float hpOutAlpha = alphaAlpha * (hpOutPrevAlpha + brainwave - hpPrevAlpha);
  hpPrevAlpha = brainwave;
  hpOutPrevAlpha = hpOutAlpha;
  filteredAlpha = filteredAlpha + alphaAlpha * (hpOutAlpha - filteredAlpha);

  // Beta band (12-30 Hz)
  float hpOutBeta = alphaBeta * (hpOutPrevBeta + brainwave - hpPrevBeta);
  hpPrevBeta = brainwave;
  hpOutPrevBeta = hpOutBeta;
  filteredBeta = filteredBeta + alphaBeta * (hpOutBeta - filteredBeta);

  // Gamma band (30-100 Hz)
  float hpOutGamma = alphaGamma * (hpOutPrevGamma + brainwave - hpPrevGamma);
  hpPrevGamma = brainwave;
  hpOutPrevGamma = hpOutGamma;
  filteredGamma = filteredGamma + alphaGamma * (hpOutGamma - filteredGamma);

  // Read MAX30102 for heart rate and SpO2
  long irValue = particleSensor.getIR();
  float heartRate = 0;
  float spo2 = 0;
  if (checkForBeat(irValue)) {
    heartRate = 60000.0 / (millis() - lastBeat);
    lastBeat = millis();
  }
  // SpO2 calculation (simplified, for demo)
  spo2 = particleSensor.getRed() / (float)particleSensor.getIR() * 100.0;

  // Emergency detection (simple thresholds, adjust as needed)
  bool emergency = false;
  bool freeFall = false;

  // Free fall detection using IMU
  float ax, ay, az;
  if (IMU.accelerationAvailable()) {
    IMU.readAcceleration(ax, ay, az);
    float totalAccel = sqrt(ax * ax + ay * ay + az * az);
    if (totalAccel < 0.5) { // Threshold for free fall (g ~ 0)
      freeFall = true;
      emergency = true;
    }
  }

  if (heartRate < 50 || heartRate > 120 || spo2 < 90) {
    emergency = true;
  }

  if (emergency) {
    digitalWrite(VIBRATION_PIN, HIGH); // Activate vibration motor
  } else {
    digitalWrite(VIBRATION_PIN, LOW);
  }

  // Send filtered band data via BLE (example: send Alpha band, or send all as array)
  // If you want to send all bands, you can pack them into a float array or add more BLE characteristics
  // Example: send Alpha band only
  brainwaveChar.writeValue(filteredAlpha);

  heartRateChar.writeValue(heartRate);
  spo2Char.writeValue(spo2);

  // Debug output
  Serial.print("Brainwave(raw): "); Serial.print(brainwave);
  Serial.print(" | Delta: "); Serial.print(filteredDelta);
  Serial.print(" | Theta: "); Serial.print(filteredTheta);
  Serial.print(" | Alpha: "); Serial.print(filteredAlpha);
  Serial.print(" | Beta: "); Serial.print(filteredBeta);
  Serial.print(" | Gamma: "); Serial.print(filteredGamma);
  Serial.print(" | HR: "); Serial.print(heartRate);
  Serial.print(" | SpO2: "); Serial.print(spo2);
  Serial.print(" | Emergency: "); Serial.print(emergency);
  Serial.print(" | FreeFall: "); Serial.println(freeFall);

  delay(500); // Adjust sampling rate as needed
}
