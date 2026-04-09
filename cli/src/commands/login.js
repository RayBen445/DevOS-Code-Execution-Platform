"use strict";

/**
 * devos login
 *
 * Prompts for an API token (generated from DevOS → Settings → API Tokens)
 * and stores it locally in the OS keychain / config directory.
 */

const { setToken, setUsername, DEVOS_API_BASE } = require("../config");

module.exports = function registerLogin(program) {
  program
    .command("login")
    .description("Authenticate with DevOS (paste your API token)")
    .option("--token <token>", "API token (skip interactive prompt)")
    .action(async (opts) => {
      let chalk, ora, fetch;
      try {
        chalk = (await import("chalk")).default;
        ora = (await import("ora")).default;
        fetch = (await import("node-fetch")).default;
      } catch {
        // Packages not installed yet; use plain output
        chalk = { green: (s) => s, red: (s) => s, cyan: (s) => s, bold: (s) => s };
        ora = () => ({ start: () => ({ succeed: console.log, fail: console.error }) });
        fetch = require("node:https").request;
      }

      let token = opts.token;

      if (!token) {
        // Interactive prompt via readline
        const readline = require("readline");
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        token = await new Promise((resolve) => {
          rl.question(
            chalk.cyan("\nPaste your DevOS API token (from Settings → API Tokens):\n> "),
            (answer) => {
              rl.close();
              resolve(answer.trim());
            }
          );
        });
      }

      if (!token) {
        console.error(chalk.red("\nToken is required."));
        process.exit(1);
      }

      const spinner = ora("Verifying token…").start();
      try {
        const res = await fetch(`${DEVOS_API_BASE}/cli/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          spinner.fail(chalk.red(`Authentication failed: ${body.message || res.statusText}`));
          process.exit(1);
        }

        const data = await res.json();
        setToken(token);
        setUsername(data.username || "");
        spinner.succeed(
          chalk.green(`Logged in as ${chalk.bold(data.username || "unknown")} ✓`)
        );
        console.log(chalk.cyan("\nRun  devos deploy  to deploy your first project.\n"));
      } catch (err) {
        spinner.fail(chalk.red(`Network error: ${err.message}`));
        process.exit(1);
      }
    });
};
