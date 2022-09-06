#!/usr/bin/env node

// This file provides backwards compatibility with the legacy cml-commands
// specified in package.json by acting as a single BusyBox-like entrypoint
// that detects the name of the executed symbolic link and invokes in turn
// the main command. E.g. cml-command should be redirected to cml command.

const { basename } = require('path');
const { pseudoexec } = require('pseudoexec');

const [, file, ...parameters] = process.argv;
const [, base, command] = basename(file).match(/^(\w+)-(.+)$/);

(async () => process.exit(await pseudoexec(base, [command, ...parameters])))();
