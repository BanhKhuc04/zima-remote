#pragma once

// ===== Wi-Fi =====
#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASSWORD "YOUR_WIFI_PASSWORD"

// ===== Discord bot =====
// Create a Discord application + bot, invite it to your server, then copy:
// - Bot token
// - Channel ID used as the control/status channel
// - Your Discord user ID (only this user may send power commands)
#define DISCORD_BOT_TOKEN "YOUR_DISCORD_BOT_TOKEN"
#define DISCORD_CHANNEL_ID "YOUR_DISCORD_CHANNEL_ID"
#define DISCORD_ALLOWED_USER_ID "YOUR_DISCORD_USER_ID"

// Command prefix used in the Discord channel.
#define DISCORD_PREFIX "!server"

// ===== Linux agent =====
// ESP8266 and the Linux PC must be on the same LAN.
// Example: http://192.168.1.50:8090
#define LINUX_AGENT_URL "http://192.168.1.50:8090"
#define LINUX_AGENT_TOKEN "CHANGE_ME_TO_THE_SAME_AGENT_TOKEN"

// ===== Relay =====
// Recommended wiring: relay dry-contact COM + NO in parallel with the motherboard
// POWER SW pins. Do NOT switch 220V mains power with this firmware.
#define RELAY_PIN D1
#define RELAY_ACTIVE_LOW true
#define POWER_BUTTON_PULSE_MS 700
#define FORCE_OFF_HOLD_MS 6000

// ===== Monitoring =====
#define DISCORD_POLL_INTERVAL_MS 5000
#define SERVER_POLL_INTERVAL_MS 15000
#define SERVER_BOOT_TIMEOUT_MS 120000
#define TEMP_ALERT_C 80.0f
