"use strict";

/**
 * devos init
 *
 * Scaffold a devos.json config file in the current directory.
 */

const fs = require("fs");
const path = require("path");

module.exports = function registerInit(program) {
  program
    .command("init")
    .description("Create a devos.json config file in the current directory")
    .option("--name <name>", "Project name")
    .option("--build <cmd>", 'Build command (e.g. "npm run build")')
    .option("--output <dir>", "Build output directory (e.g. dist)")
    .action(async (opts) => {
      let chalk, ora;
      try {
        chalk = (await import("chalk")).default;
        ora = (await import("ora")).default;
      } catch {
        chalk = { green: (s) => s, cyan: (s) => s, yellow: (s) => s, bold: (s) => s };
        ora = () => ({ start: () => ({ succeed: console.log }) });
      }

      const configPath = path.resolve("devos.json");

      if (fs.existsSync(configPath)) {
        console.log(chalk.yellow("\ndevos.json already exists. Remove it first to reinitialise.\n"));
        process.exit(0);
      }

      const config = {
        name: opts.name || path.basename(process.cwd()),
        build: opts.build || "npm run build",
        output: opts.output || "dist",
      };

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

      console.log(chalk.green("\n✓ Created devos.json\n"));
      console.log(JSON.stringify(config, null, 2));
      console.log(chalk.cyan('\nEdit devos.json then run  devos deploy  to go live.\n'));
    });
};
