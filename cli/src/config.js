"use strict";

/**
 * Shared helpers used by all CLI commands.
 */

const Conf = require("conf");
const config = new Conf({ projectName: "devos-cli" });

const DEVOS_API_BASE =
  process.env.DEVOS_API_URL || "https://api.devos.name.ng";

function getToken() {
  return config.get("token");
}

function setToken(token) {
  config.set("token", token);
}

function clearToken() {
  config.delete("token");
}

function getUsername() {
  return config.get("username");
}

function setUsername(username) {
  config.set("username", username);
}

function requireAuth() {
  const token = getToken();
  if (!token) {
    console.error(
      "\nYou are not logged in. Run:\n\n  devos login\n"
    );
    process.exit(1);
  }
  return token;
}

module.exports = {
  DEVOS_API_BASE,
  getToken,
  setToken,
  clearToken,
  getUsername,
  setUsername,
  requireAuth,
};
