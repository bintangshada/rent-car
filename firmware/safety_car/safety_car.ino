#include <WiFi.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "HX711.h"
#include <TinyGPSPlus.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <math.h>
#include <string.h>

// ==========================================
// 1. KONFIGURASI PIN
// ==========================================

#define HX711_DT 16
#define HX711_SCK 4

#define GPS_RX 32
#define GPS_TX 33

#define LCD_SDA 21
#define LCD_SCL 22

#define LED_MERAH 5
#define LED_KUNING 18
#define LED_HIJAU 19

#define BUZZER 26
#define RELAY 23

// ==========================================
// 2. KONFIGURASI WIFI DAN MQTT
// ==========================================

const char *WIFI_SSID = "";
const char *WIFI_PASSWORD = "";

const char *MQTT_HOST = "";
const int MQTT_PORT = 1883;

const char *TOPIC_BASE = "";
const char *DEVICE_CODE = "";

// ==========================================
// 3. KONFIGURASI SISTEM
// ==========================================

const float CALIBRATION_FACTOR = 500.0;

const float WARNING_KG = 0.3;
const float OVERLOAD_KG = 0.5;

const float LAT_DEFAULT = -7.333145;
const float LNG_DEFAULT = 112.788452;

// Ubah jadi false jika modul bertuliskan HIGH LEVEL TRIGGER
const bool RELAY_ACTIVE_LOW = true;
const int RELAY_ON  = RELAY_ACTIVE_LOW ? LOW : HIGH;
const int RELAY_OFF = RELAY_ACTIVE_LOW ? HIGH : LOW;

// ==========================================
// 4. INTERVAL
// ==========================================

const unsigned long INTERVAL_SENSOR = 500;
const unsigned long INTERVAL_PUBLISH = 2000;
const unsigned long INTERVAL_LCD = 500;
const unsigned long INTERVAL_SERIAL = 1000;
const unsigned long INTERVAL_RECONNECT = 5000;

// ==========================================
// 5. OBJEK KOMPONEN
// ==========================================

WiFiClient espClient;
PubSubClient mqtt(espClient);

HX711 scale;
TinyGPSPlus gps;

LiquidCrystal_I2C lcd(0x27, 16, 2);

// ==========================================
// 6. VARIABEL SISTEM
// ==========================================

char telemetryTopic[96];
char controlTopic[112];
char ackTopic[112];

float beratKg = 0.0;

float latNow = LAT_DEFAULT;
float lngNow = LNG_DEFAULT;
float speedNow = 0.0;

bool hxReady = false;

bool relayCommand = true;
bool relayActual = false;

unsigned long lastSensor = 0;
unsigned long lastPublish = 0;
unsigned long lastLcd = 0;
unsigned long lastSerial = 0;

unsigned long lastReconnect = 0;
unsigned long lastWifiAttempt = 0;

// ==========================================
// 7. MEMBACA GPS
// ==========================================

void bacaGPS() {

  while (Serial2.available() > 0) {

    gps.encode(Serial2.read());

  }

  if (gps.location.isValid()) {

    latNow = gps.location.lat();
    lngNow = gps.location.lng();

  }

  if (gps.speed.isValid()) {

    speedNow = gps.speed.kmph();

  }

}

// ==========================================
// 8. MEMBACA BERAT
// ==========================================

void bacaBerat() {

  if (scale.is_ready()) {

    float gram = scale.get_units(5);

    beratKg = gram < 0 ? 0 : gram / 1000.0;

    hxReady = true;

  }

  else {

    hxReady = false;

  }

}

// ==========================================
// 9. STATUS BERAT
// ==========================================

const char *statusBerat() {

  if (!hxReady) {

    return "SENSOR_ERROR";

  }

  if (beratKg >= OVERLOAD_KG) {

    return "OVERLOAD";

  }

  if (beratKg >= WARNING_KG) {

    return "WARNING";

  }

  return "AMAN";

}

// ==========================================
// 10. KONTROL BUZZER
// ==========================================

void kontrolBuzzer(bool aktif) {

  digitalWrite(BUZZER, aktif ? HIGH : LOW);

}

// ==========================================
// 11. KONTROL LED
// ==========================================

void kontrolLED() {

  if (!hxReady) {

    digitalWrite(LED_MERAH, LOW);
    digitalWrite(LED_KUNING, LOW);
    digitalWrite(LED_HIJAU, LOW);

    return;

  }

  if (beratKg >= OVERLOAD_KG) {

    digitalWrite(LED_MERAH, HIGH);
    digitalWrite(LED_KUNING, LOW);
    digitalWrite(LED_HIJAU, LOW);

  }

  else if (beratKg >= WARNING_KG) {

    digitalWrite(LED_MERAH, LOW);
    digitalWrite(LED_KUNING, HIGH);
    digitalWrite(LED_HIJAU, LOW);

  }

  else {

    digitalWrite(LED_MERAH, LOW);
    digitalWrite(LED_KUNING, LOW);
    digitalWrite(LED_HIJAU, HIGH);

  }

}

// ==========================================
// 12. KONTROL KEAMANAN DAN RELAY
// ==========================================

void kontrolKeamanan() {
  bool overload = hxReady && (beratKg >= OVERLOAD_KG);
  bool warning = hxReady &&
                 (beratKg >= WARNING_KG) &&
                 !overload;

  // Kontrol LED
  digitalWrite(LED_MERAH, overload ? HIGH : LOW);
  digitalWrite(LED_KUNING, warning ? HIGH : LOW);
  digitalWrite(LED_HIJAU,
               (hxReady && !warning && !overload) ? HIGH : LOW);

  // Buzzer hanya aktif ketika overload
  digitalWrite(BUZZER, overload ? HIGH : LOW);

  // Motor hanya boleh menyala jika:
  // 1. Sensor berfungsi
  // 2. Tidak overload
  // 3. Perintah relay mengizinkan motor menyala
  bool motorBolehMenyala =
      hxReady && !overload && relayCommand;

  // Active LOW: LOW = relay aktif, HIGH = relay mati
  if (motorBolehMenyala) {
    digitalWrite(RELAY, RELAY_ON);
    relayActual = true;
  } else {
    digitalWrite(RELAY, RELAY_OFF);
    relayActual = false;
  }

  // Debugging
  Serial.println("===== STATUS KEAMANAN =====");
  Serial.print("Berat: ");
  Serial.print(beratKg);
  Serial.println(" kg");

  Serial.print("Overload: ");
  Serial.println(overload ? "YA" : "TIDAK");

  Serial.print("Relay: ");
  Serial.println(relayActual ? "AKTIF - MOTOR ON" :
                               "NONAKTIF - MOTOR OFF");

  Serial.print("Pin RELAY (GPIO23): ");
  Serial.println(digitalRead(RELAY) == HIGH ? "HIGH" : "LOW");
}

// ==========================================
// 13. TAMPILAN LCD
// ==========================================

void tampilLCD() {

  lcd.setCursor(0, 0);

  if (hxReady) {

    lcd.print("Berat: ");
    lcd.print(beratKg, 2);
    lcd.print(" kg  ");

  }

  else {

    lcd.print("Berat: ERROR   ");

  }

  lcd.setCursor(0, 1);

  if (!hxReady) {

    lcd.print("CEK SENSOR      ");

  }

  else if (beratKg >= OVERLOAD_KG) {

    lcd.print("OVERLOAD CUTOFF ");

  }

  else if (beratKg >= WARNING_KG) {

    lcd.print("PERINGATAN      ");

  }

  else {

    lcd.print("KONDISI AMAN    ");

  }

}

// ==========================================
// 14. DIAGNOSTIK GPS
// ==========================================

void diagnostikGPS() {

  Serial.println();
  Serial.println("========== GPS DIAGNOSTIC ==========");

  Serial.print("Jumlah karakter: ");
  Serial.println(gps.charsProcessed());

  Serial.print("Checksum gagal: ");
  Serial.println(gps.failedChecksum());

  Serial.print("Kalimat lengkap dengan fix: ");
  Serial.println(gps.sentencesWithFix());

  Serial.print("Satelit: ");

  if (gps.satellites.isValid()) {

    Serial.println(gps.satellites.value());

  }

  else {

    Serial.println("Belum tersedia");

  }

  Serial.print("GPS Status: ");

  if (gps.location.isValid()) {

    Serial.println("FIX");

    Serial.print("Latitude: ");
    Serial.println(gps.location.lat(), 6);

    Serial.print("Longitude: ");
    Serial.println(gps.location.lng(), 6);

  }

  else {

    Serial.println("BELUM MENDAPATKAN FIX");

  }

  Serial.print("Kecepatan: ");
  Serial.print(speedNow, 1);
  Serial.println(" km/h");

  Serial.println("====================================");

}

// ==========================================
// 15. SERIAL MONITOR
// ==========================================

void tampilSerial() {

  Serial.println();
  Serial.println("====================================");
  Serial.println("PASSENGER WEIGHT SAFETY SYSTEM");
  Serial.println("====================================");

  Serial.print("HX711: ");
  Serial.println(hxReady ? "READY" : "NOT READY");

  if (hxReady) {

    Serial.print("Berat: ");
    Serial.print(beratKg, 3);
    Serial.println(" kg");

  }

  Serial.print("Status: ");
  Serial.println(statusBerat());

  Serial.print("Relay Command: ");
  Serial.println(relayCommand ? "ON" : "OFF");

  Serial.print("Relay Actual: ");
  Serial.println(relayActual ? "ON" : "OFF");

  Serial.print("Pin RELAY (GPIO23): ");
  Serial.println(digitalRead(RELAY) == HIGH ? "HIGH" : "LOW");

  Serial.print("Dinamo: ");
  Serial.println(relayActual ? "MENYALA" : "MATI");

  Serial.print("Buzzer: ");
  Serial.println(digitalRead(BUZZER) ? "ON" : "OFF");

  Serial.print("WiFi: ");
  Serial.println(
    WiFi.status() == WL_CONNECTED ? "CONNECTED" : "DISCONNECTED"
  );

  Serial.print("MQTT: ");
  Serial.println(
    mqtt.connected() ? "CONNECTED" : "DISCONNECTED"
  );

  diagnostikGPS();

}

// ==========================================
// 16. PUBLISH TELEMETRI
// ==========================================

void publishTelemetri() {

  if (!mqtt.connected()) return;

  StaticJsonDocument<256> doc;

  doc["device"] = DEVICE_CODE;

  doc["weight"] = hxReady
      ? round(beratKg * 100) / 100.0
      : -1.0;

  doc["status"] = statusBerat();

  doc["relay"] = relayActual;

  doc["lat"] = round(latNow * 1000000) / 1000000.0;

  doc["lng"] = round(lngNow * 1000000) / 1000000.0;

  doc["speed"] = round(speedNow * 10) / 10.0;

  doc["satellites"] = gps.satellites.isValid()
      ? gps.satellites.value()
      : 0;

  char payload[256];

  size_t length = serializeJson(doc, payload);

  bool success = mqtt.publish(
    telemetryTopic,
    payload,
    length
  );

  Serial.print("MQTT Telemetry: ");
  Serial.println(success ? "TERKIRIM" : "GAGAL");

}

// ==========================================
// 17. PUBLISH ACK
// ==========================================

void publishAck(const char *command) {

  if (!mqtt.connected()) return;

  StaticJsonDocument<128> doc;

  doc["device"] = DEVICE_CODE;
  doc["command"] = command;
  doc["relay"] = relayActual;
  doc["status"] = statusBerat();

  char payload[128];

  size_t length = serializeJson(doc, payload);

  mqtt.publish(ackTopic, payload, length);

}

// ==========================================
// 18. HANDLE MQTT COMMAND
// ==========================================

void handleCommand(
  char *topic,
  byte *payload,
  unsigned int length
) {

  StaticJsonDocument<256> doc;

  DeserializationError error =
      deserializeJson(doc, payload, length);

  if (error) {

    Serial.println("JSON command tidak valid");
    return;

  }

  const char *command = doc["command"] | "";

  Serial.print("MQTT Command: ");
  Serial.println(command);

  if (strcmp(command, "FORCE_ON") == 0) {

    relayCommand = true;

  }

  else if (strcmp(command, "FORCE_OFF") == 0) {

    relayCommand = false;

  }

  else if (strcmp(command, "TARE") == 0) {

    if (scale.is_ready()) {

      scale.tare();

      beratKg = 0.0;
      hxReady = true;

    }

    else {

      hxReady = false;

    }

  }

  else {

    Serial.println("Perintah tidak dikenal");
    return;

  }

  kontrolKeamanan();

  publishAck(command);

}

// ==========================================
// 19. HUBUNGKAN WIFI
// ==========================================

void hubungkanWiFi() {

  if (WiFi.status() == WL_CONNECTED) return;

  if (millis() - lastWifiAttempt < INTERVAL_RECONNECT) return;

  lastWifiAttempt = millis();

  Serial.println("Menghubungkan WiFi...");

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

}

// ==========================================
// 20. HUBUNGKAN MQTT
// ==========================================

void hubungkanMQTT() {

  if (mqtt.connected()) return;

  if (WiFi.status() != WL_CONNECTED) return;

  if (millis() - lastReconnect < INTERVAL_RECONNECT) return;

  lastReconnect = millis();

  String clientId =
      "esp32-" +
      String(DEVICE_CODE) +
      "-" +
      String(random(0xffff), HEX);

  Serial.println("Menghubungkan MQTT...");

  if (mqtt.connect(clientId.c_str())) {

    Serial.println("MQTT TERHUBUNG");

    mqtt.subscribe(controlTopic);

    publishAck("BOOT");

  }

  else {

    Serial.print("MQTT gagal, state=");
    Serial.println(mqtt.state());

  }

}

// ==========================================
// 21. SETUP
// ==========================================

void setup() {

  Serial.begin(115200);

  // GPS
  Serial2.begin(
    9600,
    SERIAL_8N1,
    GPS_RX,
    GPS_TX
  );

  // LCD
  Wire.begin(LCD_SDA, LCD_SCL);

  lcd.init();
  lcd.backlight();

  // Pin output
  pinMode(LED_MERAH, OUTPUT);
  pinMode(LED_KUNING, OUTPUT);
  pinMode(LED_HIJAU, OUTPUT);

  pinMode(BUZZER, OUTPUT);
  pinMode(RELAY, OUTPUT);

  // Output awal
  digitalWrite(LED_MERAH, LOW);
  digitalWrite(LED_KUNING, LOW);
  digitalWrite(LED_HIJAU, LOW);

  digitalWrite(BUZZER, LOW);

  // Relay awal OFF
  digitalWrite(RELAY, RELAY_OFF);

  // HX711
  scale.begin(HX711_DT, HX711_SCK);

  scale.set_scale(CALIBRATION_FACTOR);

  lcd.clear();
  lcd.print("TARE SENSOR...");

  if (scale.wait_ready_timeout(3000)) {

    scale.tare();
    hxReady = true;

  }

  else {

    hxReady = false;

  }

  // MQTT Topics
  snprintf(
    telemetryTopic,
    sizeof(telemetryTopic),
    "%s/%s",
    TOPIC_BASE,
    DEVICE_CODE
  );

  snprintf(
    controlTopic,
    sizeof(controlTopic),
    "%s/control",
    telemetryTopic
  );

  snprintf(
    ackTopic,
    sizeof(ackTopic),
    "%s/ack",
    telemetryTopic
  );

  // MQTT
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setBufferSize(512);
  mqtt.setCallback(handleCommand);

  // WiFi
  WiFi.mode(WIFI_STA);

  // Memulai koneksi WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  // Terapkan kondisi keamanan awal
  kontrolKeamanan();

  // Tampilan awal
  lcd.clear();

  lcd.setCursor(0, 0);
  lcd.print("PASSENGER");

  lcd.setCursor(0, 1);
  lcd.print("SAFETY SYSTEM");

  Serial.println();
  Serial.println("====================================");
  Serial.println("PASSENGER WEIGHT SAFETY SYSTEM");
  Serial.println("ESP32 INITIALIZATION");
  Serial.println("====================================");

  Serial.print("HX711: ");
  Serial.println(hxReady ? "READY" : "NOT READY");

  Serial.print("Relay: ");
  Serial.println(relayActual ? "ON" : "OFF");

  Serial.print("Relay mode: ");
  Serial.println(RELAY_ACTIVE_LOW ? "ACTIVE LOW" : "ACTIVE HIGH");

  Serial.println("GPS: SEARCHING SATELLITES");

  Serial.print("Telemetry Topic: ");
  Serial.println(telemetryTopic);

  Serial.print("Control Topic: ");
  Serial.println(controlTopic);

  delay(1500);

  lcd.clear();

}

// ==========================================
// 22. LOOP UTAMA
// ==========================================

void loop() {

  // Membaca GPS
  bacaGPS();

  // Membaca sensor berat
  if (millis() - lastSensor >= INTERVAL_SENSOR) {

    lastSensor = millis();

    bacaBerat();

    kontrolKeamanan();

  }

  // WiFi
  hubungkanWiFi();

  // MQTT
  hubungkanMQTT();

  if (mqtt.connected()) {

    mqtt.loop();

  }

  // Publish telemetri
  if (millis() - lastPublish >= INTERVAL_PUBLISH) {

    lastPublish = millis();

    publishTelemetri();

  }

  // Update LCD
  if (millis() - lastLcd >= INTERVAL_LCD) {

    lastLcd = millis();

    tampilLCD();

  }

  // Update Serial
  if (millis() - lastSerial >= INTERVAL_SERIAL) {

    lastSerial = millis();

    tampilSerial();

  }

}
