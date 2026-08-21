/* Полный исходник прошивки (Arduino C++, ESP32). String.raw — чтобы
   escape-последовательности C ("\n" и т.п.) сохранились как есть. */

export const FIRMWARE_MAIN = String.raw`/* =====================================================================
 *  ТАЛОН-32 — RFID-контроль питания гостей (ESP32 + RC522 + DS3231)
 *  Версия прошивки 1.2.0
 * ---------------------------------------------------------------------
 *  Один терминал на каждое место:
 *    LOCATION_ID = 1  ->  СТОЛОВАЯ
 *    LOCATION_ID = 2  ->  РЕСТОРАН
 *
 *  ПРАВИЛО: в один период (завтрак / обед / ужин) гость может войти
 *  только ОДИН раз — в столовую ИЛИ в ресторан, на свой выбор.
 *
 *  Индикация:
 *    зелёная лампа + короткий сигнал   ->  вход разрешён (первый раз)
 *    красная лампа + три гудка         ->  уже посещал в этом периоде
 *    красная лампа + длинный гудок     ->  вне времени / карта без ID
 *
 *  Посещение фиксируется и во внутреннем журнале (LittleFS), и НА САМОЙ
 *  КАРТЕ (Mifare Classic 1K, сектор 1), поэтому второй терминал «видит»
 *  посещение даже без сети:
 *     блок 4 : магия A5 C3 00 01 + ID гостя (4 байта, little-endian)
 *     блок 6 : ГГ ММ ДД | период | место | 00... | CRC (сумма 15 байт)
 *
 *  Подключение:
 *     RC522  : SDA->5  SCK->18  MOSI->23  MISO->19  RST->27, питание 3.3V!
 *     DS3231 : SDA->21 SCL->22
 *     Зелёный светодиод -> 26 (через 220 Ом), красный -> 25 (через 220 Ом)
 *     Пьезозуммер -> 32, кнопка -> 33 (второй вывод на GND)
 *
 *  Библиотеки (Менеджер библиотек Arduino IDE):
 *     MFRC522 (автор GitHubCommunity)
 *     RTClib  (автор Adafruit)
 *
 *  Кнопка: короткое нажатие — режим РЕГИСТРАЦИИ (присвоить карте ID),
 *          удержание 1.5 с — СБРОС посещения на следующей карте.
 *  Журнал: файл /visits.csv, скачивается из браузера: АДРЕС/visits.csv
 * ===================================================================== */

#include <SPI.h>
#include <MFRC522.h>
#include <Wire.h>
#include <RTClib.h>
#include <LittleFS.h>
#include <WiFi.h>
#include <WebServer.h>

/* ============================ НАСТРОЙКИ ============================ */
#define LOCATION_ID   1                    // 1 = СТОЛОВАЯ, 2 = РЕСТОРАН
#define WIFI_SSID     "HotelWiFi"          // Wi-Fi роутер отеля
#define WIFI_PASS     "password123"
// Раскомментируйте строку ниже при ПЕРВОЙ прошивке (установка часов),
// затем закомментируйте обратно и прошейте терминал ещё раз:
// #define SET_RTC "2026-02-14 08:00:00"    // ГГГГ-ММ-ДД ЧЧ:ММ:СС

#define PIN_SS        5      // RC522 SDA
#define PIN_RST       27     // RC522 RST
#define PIN_LED_GRN   26
#define PIN_LED_RED   25
#define PIN_BUZZER    32     // пьезоизлучатель (пассивный)
#define PIN_BUTTON    33     // кнопка на GND (INPUT_PULLUP)

#define LOG_FILE      "/visits.csv"
#define LOG_LIMIT_KB  400    // при превышении журнал ротируется в visits.old.csv
#define FW_VERSION    "1.2.0"

const char *LOCATION_NAME = (LOCATION_ID == 1) ? "STOLOVAYA" : "RESTORAN";
const char *LOCATION_RU   = (LOCATION_ID == 1) ? "Столовая"  : "Ресторан";

/* ============================ ПЕРИОДЫ ============================== */
struct MealSlot { uint8_t id; const char *name; uint16_t fromMin; uint16_t toMin; };
const MealSlot SLOTS[3] = {
  { 1, "BREAKFAST",  8 * 60 + 30, 11 * 60 + 30 },  // завтрак 08:30 - 11:30
  { 2, "LUNCH",     13 * 60 + 30, 15 * 60 + 30 },  // обед    13:30 - 15:30
  { 3, "DINNER",    18 * 60,      20 * 60      },  // ужин    18:00 - 20:00
};
const MealSlot *slotOf(uint16_t minute) {
  for (uint8_t i = 0; i < 3; i++)
    if (minute >= SLOTS[i].fromMin && minute < SLOTS[i].toMin) return &SLOTS[i];
  return nullptr;
}

/* ============================ ОБЪЕКТЫ ============================== */
MFRC522    mfrc522(PIN_SS, PIN_RST);
RTC_DS3231 rtc;
WebServer  server(80);

const byte KEY_DEF[6]     = { 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF };
const uint32_t CARD_MAGIC = 0xA5C30001;
const byte BLOCK_ID    = 4;   // блок с магией и ID гостя
const byte BLOCK_VISIT = 6;   // блок с последним посещением

bool     regMode      = false;  // режим регистрации
bool     resetNext    = false;  // стереть посещение со следующей карты
uint32_t verdictUntil = 0;      // до какого момента держать лампы вердикта
bool     verdictGreen = false;
uint32_t lastUidKey   = 0;      // защита от повторного чтения той же карты
uint32_t lastUidMs    = 0;

/* ============================ СИГНАЛЫ ============================== */
void ledSet(bool green, bool red) {
  digitalWrite(PIN_LED_GRN, green ? HIGH : LOW);
  digitalWrite(PIN_LED_RED, red   ? HIGH : LOW);
}
void verdict(bool green, uint16_t ms) {
  verdictGreen = green;
  verdictUntil = millis() + ms;
  ledSet(green, !green);
}
void beep(uint16_t freq, uint16_t ms) {
  ledcWriteTone(0, freq);
  delay(ms);
  ledcWriteTone(0, 0);
}
void soundOk()   { beep(1175, 90); beep(1568, 160); }                 // вход разрешён
void soundDeny() { beep(311, 140); delay(60);
                   beep(311, 140); delay(60); beep(311, 220); }       // уже посещал
void soundTime() { beep(233, 700); }                                  // вне времени / нет ID
void soundReg()  { beep(880, 80); beep(1175, 80); beep(1568, 160); }  // регистрация / сброс

/* ======================= ЖУРНАЛ (LittleFS) ========================= */
void logWriteHeader() {
  File f = LittleFS.open(LOG_FILE, "a");
  if (f) {
    if (f.size() == 0) f.print("DATETIME;UID;GUEST_ID;SLOT;LOCATION;RESULT;NOTE\r\n");
    f.close();
  }
}
void logRotate() {
  File f = LittleFS.open(LOG_FILE, "r");
  if (!f) return;
  size_t sz = f.size();
  f.close();
  if (sz > (size_t)LOG_LIMIT_KB * 1024) {
    LittleFS.remove("/visits.old.csv");
    LittleFS.rename(LOG_FILE, "/visits.old.csv");
    logWriteHeader();
  }
}
void logLine(const DateTime &dt, const String &uid, uint32_t gid,
             const char *slot, const char *loc, const char *result, const char *note) {
  char line[160];
  snprintf(line, sizeof(line), "%04d-%02d-%02d %02d:%02d:%02d;%s;%lu;%s;%s;%s;%s\r\n",
           dt.year(), dt.month(), dt.day(), dt.hour(), dt.minute(), dt.second(),
           uid.c_str(), (unsigned long)gid, slot, loc, result, note);
  Serial.print(line);
  File f = LittleFS.open(LOG_FILE, "a");
  if (f) { f.print(line); f.close(); }
  logRotate();
}

/* ======================= СЧЁТЧИК ГОСТЕЙ ============================ */
uint32_t loadCounter() {
  File f = LittleFS.open("/counter.txt", "r");
  uint32_t v = 1000;
  if (f) { v = f.parseInt(); f.close(); }
  return v < 1000 ? 1000 : v;
}
void saveCounter(uint32_t v) {
  File f = LittleFS.open("/counter.txt", "w");
  if (f) { f.print(v); f.close(); }
}

/* ======================= БЛОКИ MIFARE ============================== */
bool mifRead(byte block, byte *buf) {
  byte size = 18;
  bool ok = false;
  if (mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, block,
                               (MFRC522::Mifare_Key *)KEY_DEF, &(mfrc522.uid)) == MFRC522::STATUS_OK)
    ok = (mfrc522.MIFARE_Read(block, buf, &size) == MFRC522::STATUS_OK);
  mfrc522.PCD_StopCrypto1();
  return ok;
}
bool mifWrite(byte block, byte *buf) {
  bool ok = false;
  if (mfrc522.PCD_Authenticate(MFRC522::PICC_CMD_MF_AUTH_KEY_A, block,
                               (MFRC522::Mifare_Key *)KEY_DEF, &(mfrc522.uid)) == MFRC522::STATUS_OK)
    ok = (mfrc522.MIFARE_Write(block, buf, 16) == MFRC522::STATUS_OK);
  mfrc522.PCD_StopCrypto1();
  return ok;
}
void cardEnd() {
  mfrc522.PICC_HaltA();
  mfrc522.PCD_StopCrypto1();
}
String uidToStr() {
  String s;
  for (byte i = 0; i < mfrc522.uid.size; i++) {
    if (i) s += ":";
    if (mfrc522.uid.uidByte[i] < 0x10) s += "0";
    s += String(mfrc522.uid.uidByte[i], HEX);
  }
  s.toUpperCase();
  return s;
}

/* Прочитать ID гостя с карты; 0 = карта не зарегистрирована */
uint32_t readGuestId() {
  byte buf[18];
  if (!mifRead(BLOCK_ID, buf)) return 0;
  uint32_t magic; memcpy(&magic, buf, 4);
  if (magic != CARD_MAGIC) return 0;
  uint32_t id;    memcpy(&id, buf + 4, 4);
  return id;
}
/* Записать ID гостя на новую карту */
bool writeGuestId(uint32_t id) {
  byte buf[16] = { 0 };
  memcpy(buf, &CARD_MAGIC, 4);
  memcpy(buf + 4, &id, 4);
  return mifWrite(BLOCK_ID, buf);
}
/* Прочитать последнее посещение; false = записи нет */
bool readLastVisit(uint8_t &yy, uint8_t &mm, uint8_t &dd, uint8_t &slot, uint8_t &loc) {
  byte buf[18];
  if (!mifRead(BLOCK_VISIT, buf)) return false;
  uint8_t crc = 0;
  for (byte i = 0; i < 15; i++) crc += buf[i];
  if (crc != buf[15]) return false;
  if (buf[3] < 1 || buf[3] > 3) return false;
  yy = buf[0]; mm = buf[1]; dd = buf[2]; slot = buf[3]; loc = buf[4];
  return true;
}
/* Записать посещение на карту */
bool writeLastVisit(const DateTime &dt, uint8_t slot, uint8_t loc) {
  byte buf[16] = { 0 };
  buf[0] = (uint8_t)(dt.year() - 2000);
  buf[1] = dt.month();
  buf[2] = dt.day();
  buf[3] = slot;
  buf[4] = loc;
  uint8_t crc = 0;
  for (byte i = 0; i < 15; i++) crc += buf[i];
  buf[15] = crc;
  return mifWrite(BLOCK_VISIT, buf);
}
bool clearLastVisit() {
  byte buf[16] = { 0 };   // пустая запись, CRC = 0
  return mifWrite(BLOCK_VISIT, buf);
}

/* ======================= ОСНОВНАЯ ЛОГИКА =========================== */
void handleCard() {
  String uid = uidToStr();
  DateTime now = rtc.now();

  uint32_t key = 0;
  for (byte i = 0; i < mfrc522.uid.size && i < 4; i++)
    key = (key << 8) | mfrc522.uid.uidByte[i];
  if (key == lastUidKey && millis() - lastUidMs < 4000) { cardEnd(); return; }
  lastUidKey = key; lastUidMs = millis();

  uint32_t gid = readGuestId();

  /* --- режим сброса: стереть посещение с карты --- */
  if (resetNext) {
    bool ok = clearLastVisit();
    cardEnd();
    resetNext = false;
    verdict(true, 1500);
    if (ok) { soundReg();  logLine(now, uid, gid, "-", LOCATION_NAME, "RESET", "карта очищена"); }
    else    { soundTime(); logLine(now, uid, gid, "-", LOCATION_NAME, "ERROR", "ошибка записи"); }
    return;
  }

  /* --- режим регистрации: присвоить карте следующий ID --- */
  if (regMode) {
    if (gid != 0) {
      cardEnd();
      verdict(false, 1200); soundTime();
      logLine(now, uid, gid, "-", LOCATION_NAME, "REG", "уже зарегистрирована");
      return;
    }
    uint32_t newId = loadCounter() + 1;
    bool ok = writeGuestId(newId);
    cardEnd();
    if (ok) {
      saveCounter(newId);
      verdict(true, 2000); soundReg();
      logLine(now, uid, newId, "-", LOCATION_NAME, "REG", "гость зарегистрирован");
    } else {
      verdict(false, 2000); soundTime();
      logLine(now, uid, 0, "-", LOCATION_NAME, "ERROR", "запись не удалась (карта не Mifare Classic 1K?)");
    }
    return;
  }

  /* --- обычный режим --- */
  if (gid == 0) {
    cardEnd();
    verdict(false, 2500); soundTime();
    logLine(now, uid, 0, "-", LOCATION_NAME, "REJECT_NOREG", "карта без идентификатора");
    return;
  }

  uint16_t minute = now.hour() * 60 + now.minute();
  const MealSlot *slot = slotOf(minute);
  if (!slot) {
    cardEnd();
    verdict(false, 2500); soundTime();
    logLine(now, uid, gid, "-", LOCATION_NAME, "REJECT_TIME", "вне периода питания");
    return;
  }

  uint8_t yy, mm, dd, lastSlot, lastLoc;
  bool hasVisit = readLastVisit(yy, mm, dd, lastSlot, lastLoc);
  bool sameDay  = hasVisit && (2000 + yy) == now.year() && mm == now.month() && dd == now.day();

  if (sameDay && lastSlot == slot->id) {
    const char *where = (lastLoc == 1) ? "СТОЛОВАЯ" : "РЕСТОРАН";
    cardEnd();
    verdict(false, 3000); soundDeny();     // красная лампа + три гудка
    logLine(now, uid, gid, slot->name, LOCATION_NAME, "REJECT_ALREADY", where);
    return;
  }

  /* Первый раз в этом периоде: зелёная лампа, запись на карту и в журнал */
  bool ok = writeLastVisit(now, slot->id, LOCATION_ID);
  cardEnd();
  if (ok) {
    verdict(true, 2500); soundOk();
    logLine(now, uid, gid, slot->name, LOCATION_NAME, "OK", "вход разрешён");
  } else {
    verdict(false, 2000); soundTime();
    logLine(now, uid, gid, slot->name, LOCATION_NAME, "ERROR", "ошибка записи на карту");
  }
}

/* ======================= КНОПКА И ЛАМПЫ ============================ */
void pollButton() {
  static bool prevHigh = true;
  static uint32_t downAt = 0;
  bool high = digitalRead(PIN_BUTTON) == HIGH;    // нажата = LOW
  if (prevHigh && !high) downAt = millis();
  if (!prevHigh && high) {
    uint32_t held = millis() - downAt;
    if (held > 1500) {
      resetNext = true; regMode = false;
      beep(660, 90); beep(660, 90);
      Serial.println("[BTN] режим: СБРОС посещения на следующей карте");
    } else if (held > 40) {
      regMode = !regMode; resetNext = false;
      beep(regMode ? 1320 : 660, 90);
      Serial.println(regMode ? "[BTN] режим: РЕГИСТРАЦИЯ включена" : "[BTN] режим: РЕГИСТРАЦИЯ выключена");
    }
  }
  prevHigh = high;
}
void pollLeds() {
  if (millis() < verdictUntil) return;            // ещё показываем вердикт
  ledSet(regMode   && (millis() / 250) % 2 == 0,
         resetNext && (millis() / 250) % 2 == 0);
}

/* ======================= ВЕБ-ИНТЕРФЕЙС ============================= */
const char WEB_PAGE[] PROGMEM = R"rawliteral(
<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>ТАЛОН-32</title>
<style>
 body{font-family:Tahoma,Arial,sans-serif;background:#122419;color:#e9efdc;margin:0;padding:24px}
 .card{max-width:560px;margin:40px auto;background:#0e1d16;border:1px solid #2e5c45;padding:28px;border-left:6px solid #d18a3e}
 h1{margin:0 0 4px;font-size:22px;letter-spacing:.05em}
 .loc{color:#e5a95f}
 p{color:#aacdb8}
 .big{font-size:30px;font-family:Consolas,monospace;color:#45e08f}
 a.btn{display:inline-block;background:#d18a3e;color:#12100a;text-decoration:none;padding:10px 18px;font-weight:bold;margin-top:14px}
 a.btn:hover{background:#e5a95f}
</style></head><body>
<div class="card">
 <h1>ТАЛОН-32 · <span class="loc" id="loc">…</span></h1>
 <p>Время терминала (DS3231):</p>
 <div class="big" id="time">--:--:--</div>
 <p>Записей в журнале: <b id="rows">—</b></p>
 <a class="btn" href="/visits.csv" download>Скачать visits.csv</a>
</div>
<script>
async function tick(){
  try{
    var r = await fetch('/api/state'); var j = await r.json();
    document.getElementById('loc').textContent = j.location_ru;
    document.getElementById('time').textContent = j.time;
    document.getElementById('rows').textContent = j.rows;
  }catch(e){}
}
tick(); setInterval(tick, 1000);
</script></body></html>
)rawliteral";

long countLogRows() {
  File f = LittleFS.open(LOG_FILE, "r");
  if (!f) return 0;
  long n = 0;
  while (f.available()) { if (f.read() == '\n') n++; }
  f.close();
  return n > 0 ? n - 1 : 0;
}
void setupWeb() {
  server.on("/", []() { server.send_P(200, "text/html; charset=utf-8", WEB_PAGE); });
  server.on("/api/state", []() {
    DateTime now = rtc.now();
    char t[24];
    snprintf(t, sizeof(t), "%04d-%02d-%02d %02d:%02d:%02d",
             now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
    String json = "{\"location_ru\":\"" + String(LOCATION_RU) +
                  "\",\"time\":\"" + String(t) +
                  "\",\"rows\":" + String(countLogRows()) +
                  ",\"fw\":\"" + FW_VERSION + "\"}";
    server.send(200, "application/json", json);
  });
  server.on("/visits.csv", []() {
    File f = LittleFS.open(LOG_FILE, "r");
    if (!f) { server.send(404, "text/plain", "журнал пуст"); return; }
    server.streamFile(f, "text/csv; charset=utf-8");
    f.close();
  });
  server.begin();
}

/* ======================= WI-FI ===================================== */
void setupWifi() {
  Serial.print("[WIFI] подключение к "); Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  uint32_t t0 = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - t0 < 12000) delay(300);
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("[WIFI] готово. Адрес терминала: http://");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("[WIFI] роутер не найден — поднимаю точку доступа TALON-32 (пароль 12345678)");
    WiFi.mode(WIFI_AP);
    WiFi.softAP("TALON-32", "12345678");
    Serial.print("[WIFI] адрес в режиме точки доступа: http://");
    Serial.println(WiFi.softAPIP());   // обычно 192.168.4.1
  }
}

/* ======================= СТАРТ ===================================== */
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println();
  Serial.println("==============================================");
  Serial.print  ("  ТАЛОН-32 v"); Serial.print(FW_VERSION);
  Serial.print  ("  |  место: ");  Serial.println(LOCATION_RU);
  Serial.println("==============================================");
  Serial.println("[INFO] периоды: завтрак 08:30-11:30, обед 13:30-15:30, ужин 18:00-20:00");
  Serial.println("[INFO] кнопка: короткое нажатие = регистрация, 1.5 с = сброс карты");

  pinMode(PIN_LED_GRN, OUTPUT);
  pinMode(PIN_LED_RED, OUTPUT);
  pinMode(PIN_BUTTON, INPUT_PULLUP);
  ledSet(false, false);

  ledcSetup(0, 4000, 8);
  ledcAttachPin(PIN_BUZZER, 0);

  SPI.begin();
  mfrc522.PCD_Init();
  Serial.print("[RFID] RC522, версия чипа: ");
  mfrc522.PCD_DumpVersionToSerial();

  Wire.begin(21, 22);
  if (!rtc.begin()) {
    Serial.println("[RTC] ОШИБКА: DS3231 не найден! Проверьте SDA=21, SCL=22");
  } else {
#ifdef SET_RTC
    int y, mo, d, h, mi, s;
    sscanf(SET_RTC, "%d-%d-%d %d:%d:%d", &y, &mo, &d, &h, &mi, &s);
    rtc.adjust(DateTime(y, mo, d, h, mi, s));
    Serial.println("[RTC] часы установлены: " SET_RTC);
#endif
    if (rtc.lostPower())
      Serial.println("[RTC] ВНИМАНИЕ: DS3231 обесточивался — установите время (SET_RTC)!");
    DateTime now = rtc.now();
    Serial.printf("[RTC] время: %04d-%02d-%02d %02d:%02d:%02d\n",
                  now.year(), now.month(), now.day(), now.hour(), now.minute(), now.second());
  }

  if (!LittleFS.begin(true)) Serial.println("[FS] ОШИБКА: LittleFS не запустилась!");
  logWriteHeader();
  Serial.printf("[FS] следующий свободный ID гостя: %lu\n", (unsigned long)(loadCounter() + 1));

  setupWifi();
  setupWeb();

  logLine(rtc.now(), "00:00:00:00", 0, "-", LOCATION_NAME, "BOOT", "терминал запущен");
  verdict(true, 800);
  beep(1568, 120);
}

void loop() {
  server.handleClient();
  pollButton();
  pollLeds();

  if (mfrc522.PICC_IsNewCardPresent() && mfrc522.ReadCardSerial()) {
    handleCard();
  }
  delay(40);
}
`;

export const FIRMWARE_RTC = String.raw`/* ---------------------------------------------------------------
   ТАЛОН-32 · разовый скетч установки часов DS3231 (rtc_set.ino)
   ---------------------------------------------------------------
   1. Подключите DS3231: SDA -> 21, SCL -> 22, VCC -> 3V3, GND -> GND
   2. Прошейте этот скетч и откройте монитор порта (115200)
   3. Часы будут установлены на дату и время КОМПИЛЯЦИИ скетча
   4. Дальше прошивайте основную прошивку talon32_control.ino —
      часы DS3231 сохранит благодаря собственной батарейке CR1220
      и продолжит идти даже при отключении питания терминала.
   Библиотека: RTClib (Adafruit).
   --------------------------------------------------------------- */
#include <Wire.h>
#include <RTClib.h>

RTC_DS3231 rtc;

void setup() {
  Serial.begin(115200);
  Wire.begin(21, 22);
  delay(300);
  Serial.println("ТАЛОН-32 · установка часов DS3231");

  if (!rtc.begin()) {
    Serial.println("DS3231 не найден! Проверьте: SDA->21, SCL->22, питание 3.3V");
    while (true) delay(1000);
  }

  rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));

  DateTime now = rtc.now();
  Serial.printf("Часы установлены: %04d-%02d-%02d %02d:%02d:%02d\n",
                now.year(), now.month(), now.day(),
                now.hour(), now.minute(), now.second());
  Serial.println("Готово. Теперь можно прошивать основную прошивку.");
}

void loop() {
  delay(1000);
}
`;

export interface FwFile {
  name: string;
  desc: string;
  code: string;
}

export const FW_FILES: FwFile[] = [
  {
    name: "talon32_control.ino",
    desc: "Основная прошивка терминала — прошивается в оба ESP32 (меняется только LOCATION_ID)",
    code: FIRMWARE_MAIN,
  },
  {
    name: "rtc_set.ino",
    desc: "Разовый скетч: ставит часы DS3231 при первом запуске (по дате компиляции)",
    code: FIRMWARE_RTC,
  },
];
