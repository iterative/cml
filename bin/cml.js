#!/usr/bin/env node

const { basename } = require('path');
const { pseudoexec } = require('pseudoexec');

const which = require('which');
const winston = require('winston');
const yargs = require('yargs');

const configureLogger = (level) => {
  winston.configure({
    format: process.stdout.isTTY
      ? winston.format.combine(
          winston.format.colorize({ all: true }),
          winston.format.simple()
        )
      : winston.format.combine(
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
    transports: [
      new winston.transports.Console({
        stderrLevels: Object.keys(winston.config.npm.levels),
        handleExceptions: true,
        handleRejections: true,
        level
      })
    ]
  });
};

const runPlugin = async ({ $0: executable, command }) => {
  try {
    if (command === undefined) throw new Error('no command');
    const path = which.sync(`${basename(executable)}-${command}`);
    const parameters = process.argv.slice(process.argv.indexOf(command) + 1); // HACK
    process.exit(await pseudoexec(path, parameters));
  } catch (error) {
    yargs.showHelp();
    winston.debug(error);
  }
};

const handleError = (message, error) => {
  if (error) {
    winston.error(error);
  } else {
    yargs.showHelp();
    console.error('\n' + message);
  }
  process.exit(1);
};

const options = {
  log: {
    describe: 'Maximum log level',
    coerce: (value) => configureLogger(value) && value,
    choices: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  }
};

yargs
  .fail(handleError)
  .env('CML')
  .options(options)
  .commandDir('./cml', { exclude: /\.test\.js$/ })
  .command('$0 <command>', false, (builder) => builder.strict(false), runPlugin)
  .recommendCommands()
  .demandCommand()
  .strict()
  .parse();
