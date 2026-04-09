"use strict";

/**
 * devos whoami  — print the currently authenticated user
 */

const { getToken, getUsername } = require("../config");

module.exports = function registerWhoami(program) {
  program
    .command("whoami")
    .description("Print the currently authenticated DevOS user")
    .action(async () => {
      let chalk;
      try { chalk = (await import("chalk")).default; }
      catch { chalk = { cyan: (s) => s, bold: (s) => s, red: (s) => s }; }

      const token = getToken();
      const username = getUsername();
      if (!token) {
        console.log(chalk.red("\nNot logged in. Run:  devos login\n"));
      } else {
        console.log(chalk.cyan(`\nLogged in as ${chalk.bold(username || "(unknown)")}\n`));
      }
    });
};
