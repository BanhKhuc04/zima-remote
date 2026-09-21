#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <WiFiClientSecureBearSSL.h>
#include "config.h"

ESP8266WebServer webServer(80);

unsigned long lastDiscordPoll = 0;
unsigned long lastServerPoll = 0;
unsigned long lastTempAlert = 0;
String lastDiscordMessageId = "";
bool lastKnownServerOnline = false;
bool haveServerState = false;

struct ServerStatus {
  bool reachable = false;
  bool online = false;
  String hostname = "";
  unsigned long uptimeSeconds = 0;
  float cpuTempC = NAN;
  float load1 = NAN;
  unsigned long memoryTotalMb = 0;
  unsigned long memoryUsedMb = 0;
  float diskTotalGb = NAN;
  float diskUsedGb = NAN;
  String checkedAt = "";
};

bool relayLevel(bool active) {
  if (RELAY_ACTIVE_LOW) return active ? LOW : HIGH;
  return active ? HIGH : LOW;
}

void relaySet(bool active) {
  digitalWrite(RELAY_PIN, relayLevel(active));
}

void pulsePowerButton(unsigned long durationMs) {
  relaySet(true);
  delay(durationMs);
  relaySet(false);
}

std::unique_ptr<BearSSL::WiFiClientSecure> makeDiscordClient() {
  auto client = std::make_unique<BearSSL::WiFiClientSecure>();
  client->setInsecure();
  client->setTimeout(8000);
  return client;
}

bool discordRequest(const String& method, const String& path, const String& body, int& statusCode, String& responseBody) {
  if (WiFi.status() != WL_CONNECTED) return false;

  auto client = makeDiscordClient();
  HTTPClient http;
  String url = "https://discord.com/api/v10" + path;

  if (!http.begin(*client, url)) return false;
  http.setTimeout(8000);
  http.addHeader("Authorization", "Bot " + String(DISCORD_BOT_TOKEN));
  http.addHeader("User-Agent", "ZimaRemoteESP8266/4.0");
  if (body.length() > 0) http.addHeader("Content-Type", "application/json");

  if (method == "GET") {
    statusCode = http.GET();
  } else if (method == "POST") {
    statusCode = http.POST(body);
  } else {
    http.end();
    return false;
  }

  responseBody = http.getString();
  http.end();
  return statusCode > 0;
}

void discordSendMessage(const String& message) {
  DynamicJsonDocument doc(2048);
  doc["content"] = message;
  String body;
  serializeJson(doc, body);

  int code = 0;
  String response;
  discordRequest(
    "POST",
    "/channels/" + String(DISCORD_CHANNEL_ID) + "/messages",
    body,
    code,
    response
  );
}

bool linuxGetStatus(ServerStatus& out) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  HTTPClient http;
  String url = String(LINUX_AGENT_URL) + "/v1/status";

  if (!http.begin(client, url)) return false;
  http.setTimeout(2500);

  int code = http.GET();
  String body = http.getString();
  http.end();

  if (code != 200) return false;

  DynamicJsonDocument doc(3072);
  if (deserializeJson(doc, body)) return false;

  out.reachable = true;
  out.online = doc["online"] | true;
  out.hostname = String((const char*)(doc["hostname"] | "linux-server"));
  out.uptimeSeconds = doc["uptime_seconds"] | 0UL;

  if (!doc["cpu_temp_c"].isNull()) out.cpuTempC = doc["cpu_temp_c"].as<float>();
  if (!doc["load_1"].isNull()) out.load1 = doc["load_1"].as<float>();
  if (!doc["memory_total_mb"].isNull()) out.memoryTotalMb = doc["memory_total_mb"].as<unsigned long>();
  if (!doc["memory_used_mb"].isNull()) out.memoryUsedMb = doc["memory_used_mb"].as<unsigned long>();
  if (!doc["disk_total_gb"].isNull()) out.diskTotalGb = doc["disk_total_gb"].as<float>();
  if (!doc["disk_used_gb"].isNull()) out.diskUsedGb = doc["disk_used_gb"].as<float>();
  out.checkedAt = String((const char*)(doc["checked_at"] | ""));
  return true;
}

bool linuxPostAction(const String& action, String& responseText) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  HTTPClient http;
  String url = String(LINUX_AGENT_URL) + "/v1/system/" + action;

  if (!http.begin(client, url)) return false;
  http.setTimeout(4000);
  http.addHeader("Authorization", "Bearer " + String(LINUX_AGENT_TOKEN));
  http.addHeader("Content-Type", "application/json");

  int code = http.POST("{}");
  responseText = http.getString();
  http.end();
  return code == 202 || code == 200;
}

String formatUptime(unsigned long seconds) {
  unsigned long days = seconds / 86400UL;
  seconds %= 86400UL;
  unsigned long hours = seconds / 3600UL;
  seconds %= 3600UL;
  unsigned long minutes = seconds / 60UL;

  String out;
  if (days > 0) out += String(days) + "d ";
  if (hours > 0 || days > 0) out += String(hours) + "h ";
  out += String(minutes) + "m";
  return out;
}

String makeStatusMessage() {
  ServerStatus status;
  bool reachable = linuxGetStatus(status);

  String msg = "**Zima Remote status**\n";
  msg += "ESP8266: online";
  msg += " | Wi-Fi " + String(WiFi.RSSI()) + " dBm";
  msg += " | uptime " + formatUptime(millis() / 1000UL) + "\n";

  if (!reachable) {
    msg += "Linux PC: **offline / agent unreachable**";
    return msg;
  }

  msg += "Linux PC: **online** (" + status.hostname + ")\n";
  msg += "Uptime: " + formatUptime(status.uptimeSeconds);

  if (!isnan(status.cpuTempC)) msg += " | CPU " + String(status.cpuTempC, 1) + " C";
  if (!isnan(status.load1)) msg += " | load " + String(status.load1, 2);
  if (status.memoryTotalMb > 0) {
    msg += "\nRAM: " + String(status.memoryUsedMb) + "/" + String(status.memoryTotalMb) + " MB";
  }
  if (!isnan(status.diskTotalGb)) {
    msg += " | Disk: " + String(status.diskUsedGb, 1) + "/" + String(status.diskTotalGb, 1) + " GB";
  }
  return msg;
}

bool isAllowedAuthor(JsonObject message) {
  const char* authorId = message["author"]["id"] | "";
  bool isBot = message["author"]["bot"] | false;
  return !isBot && String(authorId) == String(DISCORD_ALLOWED_USER_ID);
}

void handleDiscordCommand(const String& content) {
  String command = content;
  command.trim();

  String prefix = String(DISCORD_PREFIX);
  if (!command.startsWith(prefix)) return;

  String suffix = command.substring(prefix.length());
  suffix.trim();
  suffix.toLowerCase();

  if (suffix == "status") {
    discordSendMessage(makeStatusMessage());
    return;
  }

  if (suffix == "on") {
    ServerStatus status;
    if (linuxGetStatus(status)) {
      discordSendMessage("Linux PC is already online.");
      return;
    }

    discordSendMessage("Power button pulse sent. Waiting for Linux...");
    pulsePowerButton(POWER_BUTTON_PULSE_MS);
    return;
  }

  if (suffix == "off") {
    ServerStatus status;
    if (!linuxGetStatus(status)) {
      discordSendMessage("Linux PC is already offline or the agent cannot be reached.");
      return;
    }

    String response;
    if (linuxPostAction("poweroff", response)) {
      discordSendMessage("Graceful shutdown requested.");
    } else {
      discordSendMessage("Graceful shutdown failed. Use forceoff only if the PC is frozen.");
    }
    return;
  }

  if (suffix == "restart") {
    ServerStatus status;
    if (!linuxGetStatus(status)) {
      discordSendMessage("Cannot restart: Linux agent is offline.");
      return;
    }

    String response;
    if (linuxPostAction("reboot", response)) {
      discordSendMessage("Graceful reboot requested.");
    } else {
      discordSendMessage("Reboot request failed.");
    }
    return;
  }

  if (suffix == "forceoff") {
    discordSendMessage("WARNING: holding the physical power button for " + String(FORCE_OFF_HOLD_MS / 1000.0f, 1) + " seconds.");
    pulsePowerButton(FORCE_OFF_HOLD_MS);
    discordSendMessage("Forced power-off pulse completed.");
    return;
  }

  if (suffix == "help") {
    discordSendMessage(
      "**Commands**\n"
      + prefix + " status - machine/ESP status\n"
      + prefix + " on - pulse motherboard power switch\n"
      + prefix + " off - graceful Linux shutdown\n"
      + prefix + " restart - graceful reboot\n"
      + prefix + " forceoff - hold power switch; use only when frozen"
    );
  }
}

void pollDiscord() {
  int code = 0;
  String body;

  // On first boot, snapshot the newest message and execute nothing from history.
  if (lastDiscordMessageId.length() == 0) {
    String bootstrapPath = "/channels/" + String(DISCORD_CHANNEL_ID) + "/messages?limit=1";
    if (!discordRequest("GET", bootstrapPath, "", code, body) || code != 200) return;

    DynamicJsonDocument bootstrapDoc(2048);
    if (deserializeJson(bootstrapDoc, body) || !bootstrapDoc.is<JsonArray>()) return;

    JsonArray bootstrapMessages = bootstrapDoc.as<JsonArray>();
    if (bootstrapMessages.size() > 0) {
      lastDiscordMessageId = String((const char*)(bootstrapMessages[0]["id"] | ""));
    }
    return;
  }

  String path = "/channels/" + String(DISCORD_CHANNEL_ID)
    + "/messages?after=" + lastDiscordMessageId + "&limit=10";

  if (!discordRequest("GET", path, "", code, body) || code != 200) return;

  DynamicJsonDocument doc(12288);
  if (deserializeJson(doc, body) || !doc.is<JsonArray>()) return;

  JsonArray messages = doc.as<JsonArray>();
  if (messages.size() == 0) return;

  // Discord returns newest first. Execute oldest-to-newest so commands stay ordered.
  for (int i = (int)messages.size() - 1; i >= 0; --i) {
    JsonObject message = messages[i];

    if (isAllowedAuthor(message)) {
      String content = String((const char*)(message["content"] | ""));
      handleDiscordCommand(content);
    }
  }

  lastDiscordMessageId = String((const char*)(messages[0]["id"] | lastDiscordMessageId.c_str()));
}

void monitorServer() {
  ServerStatus status;
  bool online = linuxGetStatus(status);

  if (!haveServerState) {
    haveServerState = true;
    lastKnownServerOnline = online;
  } else if (online != lastKnownServerOnline) {
    lastKnownServerOnline = online;
    discordSendMessage(online ? "Linux PC is now **ONLINE**." : "Linux PC is now **OFFLINE**.");
  }

  if (online && !isnan(status.cpuTempC) && status.cpuTempC >= TEMP_ALERT_C) {
    unsigned long now = millis();
    if (lastTempAlert == 0 || now - lastTempAlert > 30UL * 60UL * 1000UL) {
      lastTempAlert = now;
      discordSendMessage(
        "Temperature alert: CPU is " + String(status.cpuTempC, 1) +
        " C (threshold " + String(TEMP_ALERT_C, 1) + " C)."
      );
    }
  }
}

void setupWebStatus() {
  webServer.on("/", HTTP_GET, []() {
    webServer.send(200, "text/plain", "Zima Remote ESP8266 controller");
  });

  webServer.on("/status", HTTP_GET, []() {
    ServerStatus server;
    bool serverOnline = linuxGetStatus(server);

    DynamicJsonDocument doc(1024);
    doc["esp_online"] = true;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["esp_uptime_seconds"] = millis() / 1000UL;
    doc["server_online"] = serverOnline;

    if (serverOnline) {
      doc["hostname"] = server.hostname;
      if (!isnan(server.cpuTempC)) doc["cpu_temp_c"] = server.cpuTempC;
      doc["server_uptime_seconds"] = server.uptimeSeconds;
    }

    String body;
    serializeJson(doc, body);
    webServer.send(200, "application/json", body);
  });

  webServer.begin();
}

void connectWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void setup() {
  Serial.begin(115200);
  delay(100);

  pinMode(RELAY_PIN, OUTPUT);
  relaySet(false);

  connectWiFi();
  setupWebStatus();

  discordSendMessage(
    "Zima Remote ESP8266 is online at " + WiFi.localIP().toString() +
    ". Type " + String(DISCORD_PREFIX) + " help for commands."
  );
}

void loop() {
  webServer.handleClient();

  if (WiFi.status() != WL_CONNECTED) {
    delay(250);
    return;
  }

  unsigned long now = millis();

  if (now - lastDiscordPoll >= DISCORD_POLL_INTERVAL_MS) {
    lastDiscordPoll = now;
    pollDiscord();
  }

  if (now - lastServerPoll >= SERVER_POLL_INTERVAL_MS) {
    lastServerPoll = now;
    monitorServer();
  }

  delay(10);
}
