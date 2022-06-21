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

exports.options = {
  log: {
    type: 'string',
    description: 'Maximum log level',
    coerce: (value) => configureLogger(value) && value,
    choices: ['error', 'warn', 'info', 'debug'],
    default: 'info'
  },
  driver: {
    type: 'string',
    choices: ['github', 'gitlab', 'bitbucket'],
    description:
      'Forge where the repository is hosted. If not specified, it will be inferred from the environment'
  },
  repo: {
    type: 'string',
    description:
      'Repository. If not specified, it will be inferred from the environment'
  },
  token: {
    type: 'string',
    description:
      'Personal access token. If not specified, it will be inferred from the environment'
  }
};

const legacyEnvironmentVariables = {
  TB_CREDENTIALS: 'CML_TENSORBOARD_DEV_CREDENTIALS',
  DOCKER_MACHINE: 'CML_RUNNER_DOCKER_MACHINE',
  RUNNER_IDLE_TIMEOUT: 'CML_RUNNER_IDLE_TIMEOUT',
  RUNNER_LABELS: 'CML_RUNNER_LABELS',
  RUNNER_SINGLE: 'CML_RUNNER_SINGLE',
  RUNNER_REUSE: 'CML_RUNNER_REUSE',
  RUNNER_NO_RETRY: 'CML_RUNNER_NO_RETRY',
  RUNNER_DRIVER: 'CML_RUNNER_DRIVER',
  RUNNER_REPO: 'CML_RUNNER_REPO',
  RUNNER_PATH: 'CML_RUNNER_PATH'
};

for (const [oldName, newName] of Object.entries(legacyEnvironmentVariables)) {
  if (process.env[oldName]) process.env[newName] = process.env[oldName];
}

yargs
  .fail(handleError)
  .env('CML')
  .options(exports.options)
  .commandDir('./cml')
  .commandDir('./legacy')
  .command('$0 <command>', false, (builder) => builder.strict(false), runPlugin)
  .recommendCommands()
  .demandCommand()
  .strict()
  .parse();
