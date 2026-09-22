#include <Arduino.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <ESP8266WebServer.h>
#include <ESP8266WiFi.h>
#include <WebSocketsClient.h>
#include <WiFiClient.h>
#include <WiFiClientSecureBearSSL.h>
#include "config.h"

ESP8266WebServer webServer(80);
WebSocketsClient discordGateway;

unsigned long lastServerPoll = 0;
unsigned long lastTempAlert = 0;
unsigned long heartbeatIntervalMs = 0;
unsigned long lastHeartbeatAt = 0;
int32_t gatewaySequence = -1;
bool gatewayReady = false;
bool lastKnownServerOnline = false;
bool haveServerState = false;
bool bootRequested = false;
unsigned long bootRequestedAt = 0;

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
};

void logLine(const String& message) {
  Serial.println(message);
}

bool relayLevel(bool active) {
  return RELAY_ACTIVE_LOW ? (active ? LOW : HIGH) : (active ? HIGH : LOW);
}

void relaySet(bool active) {
  digitalWrite(RELAY_PIN, relayLevel(active));
}

void pulsePowerButton(unsigned long durationMs) {
  logLine("[RELAY] pulse " + String(durationMs) + " ms");
  relaySet(true);
  delay(durationMs);
  relaySet(false);
}

std::unique_ptr<BearSSL::WiFiClientSecure> makeDiscordClient() {
  auto client = std::make_unique<BearSSL::WiFiClientSecure>();
  client->setInsecure();
  client->setTimeout(6000);
  return client;
}

bool discordRequest(
  const String& method,
  const String& path,
  const String& body,
  int& statusCode,
  String& responseBody,
  bool withBotAuth = true
) {
  if (WiFi.status() != WL_CONNECTED) return false;

  auto client = makeDiscordClient();
  HTTPClient http;
  String url = "https://discord.com/api/v10" + path;

  if (!http.begin(*client, url)) {
    logLine("[DISCORD REST] http.begin failed");
    return false;
  }

  http.setTimeout(6000);
  http.addHeader("User-Agent", "ZimaRemoteESP8266/4.1");
  if (withBotAuth) {
    http.addHeader("Authorization", "Bot " + String(DISCORD_BOT_TOKEN));
  }
  if (body.length() > 0) {
    http.addHeader("Content-Type", "application/json");
  }

  if (method == "GET") {
    statusCode = http.GET();
  } else if (method == "POST") {
    statusCode = http.POST(body);
  } else if (method == "PUT") {
    statusCode = http.sendRequest("PUT", body);
  } else {
    http.end();
    return false;
  }

  responseBody = http.getString();
  http.end();

  logLine("[DISCORD REST] " + method + " " + path + " -> " + String(statusCode));
  if (statusCode < 200 || statusCode >= 300) {
    String preview = responseBody;
    if (preview.length() > 400) preview = preview.substring(0, 400);
    logLine("[DISCORD REST] " + preview);
  }

  return statusCode > 0;
}

void discordSendChannelMessage(const String& message) {
  JsonDocument doc;
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

bool registerSlashCommands() {
  JsonDocument doc;
  JsonObject command = doc.add<JsonObject>();
  command["name"] = "server";
  command["description"] = "Dieu khien Zima server";
  command["type"] = 1;

  JsonArray options = command["options"].to<JsonArray>();

  auto addSubcommand = [&](const char* name, const char* description) {
    JsonObject option = options.add<JsonObject>();
    option["type"] = 1;
    option["name"] = name;
    option["description"] = description;
  };

  addSubcommand("status", "Xem trang thai server va ESP8266");
  addSubcommand("on", "Bat may bang relay POWER SW");
  addSubcommand("off", "Tat Linux an toan");
  addSubcommand("restart", "Khoi dong lai Linux");
  addSubcommand("forceoff", "Giu nut nguon de tat cuong buc");

  String body;
  serializeJson(doc, body);

  int code = 0;
  String response;
  bool ok = discordRequest(
    "PUT",
    "/applications/" + String(DISCORD_APPLICATION_ID)
      + "/guilds/" + String(DISCORD_GUILD_ID) + "/commands",
    body,
    code,
    response
  );

  if (ok && code >= 200 && code < 300) {
    logLine("[DISCORD] slash commands synced");
    return true;
  }

  logLine("[DISCORD] slash command sync FAILED");
  return false;
}

bool linuxGetStatus(ServerStatus& out) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  HTTPClient http;
  String url = String(LINUX_AGENT_URL) + "/v1/status";

  if (!http.begin(client, url)) return false;
  http.setTimeout(1800);

  int code = http.GET();
  String body = http.getString();
  http.end();

  if (code != 200) return false;

  JsonDocument doc;
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

  return true;
}

bool linuxTcpReachable() {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  bool connected = client.connect(LINUX_LAN_IP, LINUX_SSH_PORT);
  if (connected) client.stop();
  return connected;
}

bool pcProbablyOnline() {
  ServerStatus status;
  if (linuxGetStatus(status)) return true;
  return linuxTcpReachable();
}

bool linuxPostAction(const String& action) {
  if (WiFi.status() != WL_CONNECTED) return false;

  WiFiClient client;
  HTTPClient http;
  String url = String(LINUX_AGENT_URL) + "/v1/system/" + action;

  if (!http.begin(client, url)) return false;

  http.setTimeout(2200);
  http.addHeader("Authorization", "Bearer " + String(LINUX_AGENT_TOKEN));
  http.addHeader("Content-Type", "application/json");

  int code = http.POST("{}");
  String response = http.getString();
  http.end();

  logLine("[LINUX] POST " + action + " -> " + String(code));
  return code == 200 || code == 202;
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

  String msg = "**Zima Remote**\n";
  msg += "ESP8266: **online**";
  msg += " | Wi-Fi " + String(WiFi.RSSI()) + " dBm";
  msg += " | uptime " + formatUptime(millis() / 1000UL) + "\n";

  if (!reachable) {
    if (linuxTcpReachable()) {
      msg += "Linux: **reachable**, agent khong phan hoi";
    } else {
      msg += "Linux: **offline**";
    }
    return msg;
  }

  msg += "Linux: **online** (" + status.hostname + ")\n";
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

bool respondInteraction(
  const String& interactionId,
  const String& interactionToken,
  const String& message,
  bool ephemeral = false
) {
  JsonDocument doc;
  doc["type"] = 4;
  JsonObject data = doc["data"].to<JsonObject>();
  data["content"] = message;
  if (ephemeral) data["flags"] = 64;

  String body;
  serializeJson(doc, body);

  int code = 0;
  String response;
  return discordRequest(
    "POST",
    "/interactions/" + interactionId + "/" + interactionToken + "/callback",
    body,
    code,
    response,
    false
  ) && code >= 200 && code < 300;
}

void handleServerInteraction(JsonObject interaction) {
  String interactionId = String((const char*)(interaction["id"] | ""));
  String interactionToken = String((const char*)(interaction["token"] | ""));
  String channelId = String((const char*)(interaction["channel_id"] | ""));

  const char* userIdRaw = interaction["member"]["user"]["id"] | nullptr;
  if (userIdRaw == nullptr) {
    userIdRaw = interaction["user"]["id"] | "";
  }
  String userId = String(userIdRaw);

  if (userId != String(DISCORD_ALLOWED_USER_ID)) {
    logLine("[CMD] denied user " + userId);
    respondInteraction(interactionId, interactionToken, "Ban khong co quyen dieu khien server nay.", true);
    return;
  }

  if (channelId != String(DISCORD_CHANNEL_ID)) {
    respondInteraction(
      interactionId,
      interactionToken,
      "Hay dung lenh trong kenh dieu khien da cau hinh.",
      true
    );
    return;
  }

  JsonArray options = interaction["data"]["options"].as<JsonArray>();
  String action = options.size() > 0
    ? String((const char*)(options[0]["name"] | ""))
    : "";

  logLine("[CMD] /server " + action + " by " + userId);

  if (action == "status") {
    respondInteraction(interactionId, interactionToken, makeStatusMessage());
    return;
  }

  if (action == "on") {
    if (pcProbablyOnline()) {
      respondInteraction(interactionId, interactionToken, "Linux dang online. Khong bam relay.");
      return;
    }

    pulsePowerButton(POWER_BUTTON_PULSE_MS);
    bootRequested = true;
    bootRequestedAt = millis();
    respondInteraction(interactionId, interactionToken, "Da bam POWER SW. Dang cho Linux khoi dong...");
    return;
  }

  if (action == "off") {
    ServerStatus status;
    if (!linuxGetStatus(status)) {
      respondInteraction(interactionId, interactionToken, "Linux agent khong truy cap duoc.");
      return;
    }

    respondInteraction(
      interactionId,
      interactionToken,
      linuxPostAction("poweroff")
        ? "Da gui lenh tat Linux an toan."
        : "Gui lenh tat may that bai."
    );
    return;
  }

  if (action == "restart") {
    ServerStatus status;
    if (!linuxGetStatus(status)) {
      respondInteraction(interactionId, interactionToken, "Linux agent khong truy cap duoc.");
      return;
    }

    respondInteraction(
      interactionId,
      interactionToken,
      linuxPostAction("reboot")
        ? "Da gui lenh khoi dong lai."
        : "Gui lenh restart that bai."
    );
    return;
  }

  if (action == "forceoff") {
    pulsePowerButton(FORCE_OFF_HOLD_MS);
    respondInteraction(
      interactionId,
      interactionToken,
      "Da giu POWER SW " + String(FORCE_OFF_HOLD_MS / 1000.0f, 1)
        + " giay. Chi dung forceoff khi may bi treo."
    );
    return;
  }

  respondInteraction(interactionId, interactionToken, "Lenh khong hop le.", true);
}

void sendGatewayHeartbeat() {
  JsonDocument doc;
  doc["op"] = 1;
  if (gatewaySequence >= 0) {
    doc["d"] = gatewaySequence;
  } else {
    doc["d"] = nullptr;
  }

  String payload;
  serializeJson(doc, payload);
  discordGateway.sendTXT(payload);
  lastHeartbeatAt = millis();
}

void sendGatewayIdentify() {
  JsonDocument doc;
  doc["op"] = 2;

  JsonObject data = doc["d"].to<JsonObject>();
  data["token"] = DISCORD_BOT_TOKEN;
  data["intents"] = 1;

  JsonObject properties = data["properties"].to<JsonObject>();
  properties["os"] = "esp8266";
  properties["browser"] = "zima-remote";
  properties["device"] = "zima-remote";

  String payload;
  serializeJson(doc, payload);
  discordGateway.sendTXT(payload);
  logLine("[GATEWAY] identify sent");
}

void handleGatewayPayload(uint8_t* payload, size_t length) {
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    logLine("[GATEWAY] JSON parse error");
    return;
  }

  int op = doc["op"] | -1;
  if (!doc["s"].isNull()) {
    gatewaySequence = doc["s"].as<int32_t>();
  }

  if (op == 10) {
    heartbeatIntervalMs = doc["d"]["heartbeat_interval"] | 45000UL;
    lastHeartbeatAt = millis();
    logLine("[GATEWAY] HELLO heartbeat=" + String(heartbeatIntervalMs) + " ms");
    sendGatewayIdentify();
    return;
  }

  if (op == 11) return;

  if (op == 7 || op == 9) {
    logLine("[GATEWAY] reconnect requested");
    discordGateway.disconnect();
    return;
  }

  if (op != 0) return;

  String eventName = String((const char*)(doc["t"] | ""));

  if (eventName == "READY") {
    gatewayReady = true;
    logLine("[GATEWAY] READY - bot online");
    return;
  }

  if (eventName == "INTERACTION_CREATE") {
    JsonObject interaction = doc["d"].as<JsonObject>();
    String commandName = String((const char*)(interaction["data"]["name"] | ""));
    if (commandName == "server") {
      handleServerInteraction(interaction);
    }
  }
}

void gatewayEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {
    case WStype_DISCONNECTED:
      gatewayReady = false;
      heartbeatIntervalMs = 0;
      logLine("[GATEWAY] disconnected");
      break;

    case WStype_CONNECTED:
      logLine("[GATEWAY] websocket connected");
      break;

    case WStype_TEXT:
      handleGatewayPayload(payload, length);
      break;

    case WStype_ERROR:
      logLine("[GATEWAY] websocket error");
      break;

    default:
      break;
  }
}

void startDiscordGateway() {
  discordGateway.beginSSL("gateway.discord.gg", 443, "/?v=10&encoding=json");
  discordGateway.setInsecure();
  discordGateway.onEvent(gatewayEvent);
  discordGateway.setReconnectInterval(5000);
  logLine("[GATEWAY] connecting...");
}

void monitorServer() {
  ServerStatus status;
  bool agentOnline = linuxGetStatus(status);
  bool online = agentOnline || linuxTcpReachable();

  if (!haveServerState) {
    haveServerState = true;
    lastKnownServerOnline = online;
  } else if (online != lastKnownServerOnline) {
    lastKnownServerOnline = online;
    discordSendChannelMessage(
      online ? "Linux PC is now **ONLINE**." : "Linux PC is now **OFFLINE**."
    );
  }

  if (bootRequested) {
    if (online) {
      bootRequested = false;
    } else if (millis() - bootRequestedAt >= SERVER_BOOT_TIMEOUT_MS) {
      bootRequested = false;
      discordSendChannelMessage(
        "Boot timeout: Linux PC did not become reachable after the power pulse."
      );
    }
  }

  if (agentOnline && !isnan(status.cpuTempC) && status.cpuTempC >= TEMP_ALERT_C) {
    unsigned long now = millis();
    if (lastTempAlert == 0 || now - lastTempAlert >= 30UL * 60UL * 1000UL) {
      lastTempAlert = now;
      discordSendChannelMessage(
        "Temperature alert: CPU is " + String(status.cpuTempC, 1)
          + " C (threshold " + String(TEMP_ALERT_C, 1) + " C)."
      );
    }
  }
}

void setupWebStatus() {
  webServer.on("/", HTTP_GET, []() {
    webServer.send(200, "text/plain", "Zima Remote ESP8266 controller");
  });

  webServer.on("/status", HTTP_GET, []() {
    JsonDocument doc;
    doc["esp_online"] = true;
    doc["gateway_ready"] = gatewayReady;
    doc["wifi_rssi"] = WiFi.RSSI();
    doc["esp_ip"] = WiFi.localIP().toString();
    doc["esp_uptime_seconds"] = millis() / 1000UL;

    ServerStatus server;
    bool serverOnline = linuxGetStatus(server);
    doc["server_online"] = serverOnline;

    if (serverOnline) {
      doc["hostname"] = server.hostname;
      doc["server_uptime_seconds"] = server.uptimeSeconds;
      if (!isnan(server.cpuTempC)) doc["cpu_temp_c"] = server.cpuTempC;
    }

    String body;
    serializeJson(doc, body);
    webServer.send(200, "application/json", body);
  });

  webServer.begin();
}

void connectWiFi() {
  logLine("[WIFI] connecting to " + String(WIFI_SSID));

  WiFi.mode(WIFI_STA);
  WiFi.persistent(false);
  WiFi.setAutoReconnect(true);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startedAt = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");

    if (millis() - startedAt >= 30000UL) {
      Serial.println();
      logLine("[WIFI] timeout -> restart");
      ESP.restart();
    }
  }

  Serial.println();
  logLine("[WIFI] connected");
  logLine("[WIFI] IP " + WiFi.localIP().toString());
  logLine("[WIFI] RSSI " + String(WiFi.RSSI()) + " dBm");
}

void setup() {
  Serial.begin(115200);
  delay(1200);

  Serial.println();
  Serial.println("====================================");
  Serial.println(" Zima Remote ESP8266 v4.1 Gateway");
  Serial.println("====================================");

  digitalWrite(RELAY_PIN, relayLevel(false));
  pinMode(RELAY_PIN, OUTPUT);
  relaySet(false);

  connectWiFi();
  setupWebStatus();

  registerSlashCommands();
  startDiscordGateway();

  discordSendChannelMessage(
    "Zima Remote ESP8266 started at " + WiFi.localIP().toString()
      + ". Slash command: /server."
  );
}

void loop() {
  webServer.handleClient();
  discordGateway.loop();

  if (WiFi.status() != WL_CONNECTED) {
    delay(100);
    return;
  }

  unsigned long now = millis();

  if (heartbeatIntervalMs > 0 && now - lastHeartbeatAt >= heartbeatIntervalMs) {
    sendGatewayHeartbeat();
  }

  if (now - lastServerPoll >= SERVER_POLL_INTERVAL_MS) {
    lastServerPoll = now;
    monitorServer();
  }

  delay(5);
}
