#!/usr/bin/env node
"use strict";

const { program } = require("commander");
const pkg = require("../package.json");

program
  .name("devos")
  .description("DevOS CLI — deploy projects from your terminal")
  .version(pkg.version);

// Register sub-commands
require("../src/commands/login")(program);
require("../src/commands/deploy")(program);
require("../src/commands/init")(program);
require("../src/commands/logout")(program);
require("../src/commands/whoami")(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err.message);
  process.exit(1);
});
