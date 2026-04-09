"use strict";

/**
 * devos logout  — clear stored credentials
 */

const { clearToken } = require("../config");

module.exports = function registerLogout(program) {
  program
    .command("logout")
    .description("Log out and clear stored credentials")
    .action(async () => {
      let chalk;
      try { chalk = (await import("chalk")).default; }
      catch { chalk = { green: (s) => s }; }
      clearToken();
      console.log(chalk.green("\nLogged out successfully.\n"));
    });
};
