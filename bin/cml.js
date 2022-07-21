#!/usr/bin/env node

const { basename } = require('path');
const { pseudoexec } = require('pseudoexec');

const which = require('which');
const winston = require('winston');
const yargs = require('yargs');

const CML = require('../src/cml').default;
const { jitsuEventPayload } = require('../src/analytics');
let OPTS;

const setupOpts = (opts) => {
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

  const { markdownfile } = opts;
  opts.markdownFile = markdownfile;
  opts.cmlCommand = opts._[0];
  opts.cml = new CML(opts);

  OPTS = opts;
};

const setupLogger = (opts) => {
  const { log: level } = opts;

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

const setupTelemetry = async (opts) => {
  const { cml, cmlCommand: action } = opts;
  opts.telemetryEvent = await jitsuEventPayload({ action, cml });
};

const runPlugin = async ({ $0: executable, command }) => {
  if (command === undefined) throw new Error('no command');
  const path = which.sync(`${basename(executable)}-${command}`);
  const parameters = process.argv.slice(process.argv.indexOf(command) + 1); // HACK
  await pseudoexec(path, parameters);
};

const handleError = async (message, error, yargs) => {
  if (error) {
    const { telemetryEvent, cml } = OPTS;
    const event = { ...telemetryEvent, error: error.message };
    await cml.telemetrySend({ event });
    return;
  }

  yargs.showHelp();
  console.error('\n' + message);
};

process.on('uncaughtException', async (err) => {
  await handleError('', err, yargs);
});

process.on('unhandledRejection', async (reason) => {
  await handleError('', new Error(reason), yargs);
});

yargs
  .env('CML')
  .options({
    log: {
      type: 'string',
      description: 'Maximum log level',
      choices: ['error', 'warn', 'info', 'debug'],
      default: 'info'
    }
  })
  .fail(handleError)
  .middleware(setupOpts)
  .middleware(setupLogger)
  .middleware(setupTelemetry)
  .commandDir('./cml', { exclude: /\.test\.js$/ })
  .command('$0 <command>', false, (builder) => builder.strict(false), runPlugin)
  .recommendCommands()
  .demandCommand()
  .strict()
  .parse();
