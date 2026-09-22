#pragma once

// ===== Wi-Fi =====
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ===== Discord =====
// Developer Portal -> General Information -> Application ID
#define DISCORD_APPLICATION_ID "YOUR_DISCORD_APPLICATION_ID"

// Developer Mode in Discord:
// - right click server -> Copy Server ID
// - right click control channel -> Copy Channel ID
// - right click your account -> Copy User ID
#define DISCORD_GUILD_ID "YOUR_DISCORD_SERVER_ID"
#define DISCORD_CHANNEL_ID "YOUR_DISCORD_CHANNEL_ID"
#define DISCORD_ALLOWED_USER_ID "YOUR_DISCORD_USER_ID"

// Developer Portal -> Bot -> Token
#define DISCORD_BOT_TOKEN "YOUR_DISCORD_BOT_TOKEN"

// ===== Linux agent =====
// ESP8266 and Linux PC should be on the same LAN.
// Example: http://192.168.1.50:8090
#define LINUX_AGENT_URL "http://192.168.1.50:8090"
#define LINUX_AGENT_TOKEN "CHANGE_ME_TO_THE_SAME_AGENT_TOKEN"

// Fallback reachability check. Prevents /server on from pulsing POWER SW
// when Linux is already running but the telemetry agent is temporarily down.
#define LINUX_LAN_IP "192.168.1.50"
#define LINUX_SSH_PORT 22

// ===== Relay =====
// Dry-contact COM + NO in parallel with motherboard POWER SW.
// Do NOT switch 220V/110V mains with this firmware.
#define RELAY_PIN D1
#define RELAY_ACTIVE_LOW true
#define POWER_BUTTON_PULSE_MS 700
#define FORCE_OFF_HOLD_MS 6000

// ===== Monitoring =====
#define SERVER_POLL_INTERVAL_MS 15000
#define SERVER_BOOT_TIMEOUT_MS 120000
#define TEMP_ALERT_C 80.0f
