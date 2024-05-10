#!/usr/bin/env node

const { basename } = require('path');
const { pseudoexec } = require('pseudoexec');

const kebabcaseKeys = require('kebabcase-keys');
const which = require('which');
const { logger, setupLogger } = require('../src/logger');
const yargs = require('yargs');

const CML = require('../src/cml').default;
const { jitsuEventPayload, send } = require('../src/analytics');

const aliasLegacyEnvironmentVariables = () => {
  const legacyEnvironmentPrefixes = {
    CML_CI: 'CML_REPO',
    CML_PUBLISH: 'CML_ASSET',
    CML_RERUN_WORKFLOW: 'CML_WORKFLOW',
    CML_SEND_COMMENT: 'CML_COMMENT',
    CML_SEND_GITHUB_CHECK: 'CML_CHECK',
    CML_TENSORBOARD_DEV: 'CML_TENSORBOARD'
  };

  for (const [oldPrefix, newPrefix] of Object.entries(
    legacyEnvironmentPrefixes
  )) {
    for (const key in process.env) {
      if (key.startsWith(`${oldPrefix}_`))
        process.env[key.replace(oldPrefix, newPrefix)] = process.env[key];
    }
  }

  // Remap environment variable prefixes so e.g. CML_OPTION global options become
  // an alias for CML_COMMAND_OPTION, to be interpreted by the appropriate subcommands.
  // See also https://github.com/yargs/yargs/issues/873#issuecomment-917441475
  for (const globalOption of ['DRIVER', 'DRIVER_TOKEN', 'LOG', 'REPO', 'TOKEN'])
    for (const subcommand of [
      'ASSET',
      'CHECK',
      'COMMENT',
      'PR',
      'REPO',
      'RUNNER',
      'TENSORBOARD',
      'WORKFLOW'
    ])
      if (process.env[`CML_${globalOption}`] !== undefined)
        process.env[`CML_${subcommand}_${globalOption}`] =
          process.env[`CML_${globalOption}`];

  const legacyEnvironmentVariables = {
    TB_CREDENTIALS: 'CML_TENSORBOARD_CREDENTIALS',
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
};

const setupOpts = (opts) => {
  const { markdownfile } = opts;
  opts.markdownFile = markdownfile;
  opts.cml = new CML(opts);
};

const setupTelemetry = async (opts, yargs) => {
  const { cml, _: command } = opts;

  const options = {};
  for (const [name, option] of Object.entries(opts.options)) {
    // Skip options with default values (i.e. not explicitly set by users)
    if (opts[name] && !yargs.parsed.defaulted[name]) {
      switch (option.telemetryData) {
        case 'name':
          options[name] = null;
          break;
        case 'full':
          options[name] = opts[name];
          break;
      }
    }
  }

  opts.telemetryEvent = await jitsuEventPayload({
    action: command.join(':'),
    extra: { options },
    cml
  });
};

const runPlugin = async ({ $0: executable, command }) => {
  if (command === undefined) throw new Error('no command');
  const { argv } = process.argv;
  const path = which.sync(`${basename(executable)}-${command}`);
  const parameters = argv.slice(argv.indexOf(command) + 1); // HACK
  await pseudoexec(path, parameters);
};

const handleError = (message, error) => {
  if (!error) {
    yargs.showHelp();
    console.error('\n' + message);
    process.exit(1);
  }
};

(async () => {
  aliasLegacyEnvironmentVariables();
  setupLogger({ log: 'debug' });

  try {
    await yargs
      .options(
        kebabcaseKeys({
          log: {
            type: 'string',
            description: 'Logging verbosity',
            choices: ['error', 'warn', 'info', 'debug'],
            default: 'info',
            group: 'Global Options:'
          },
          driver: {
            type: 'string',
            choices: ['github', 'gitlab', 'bitbucket'],
            defaultDescription: 'infer from the environment',
            description: 'Git provider where the repository is hosted',
            group: 'Global Options:'
          },
          repo: {
            type: 'string',
            defaultDescription: 'infer from the environment',
            description: 'Repository URL or slug',
            group: 'Global Options:'
          },
          driverToken: {
            type: 'string',
            alias: 'token',
            defaultDescription: 'infer from the environment',
            description: 'CI driver personal/project access token (PAT)',
            group: 'Global Options:'
          }
        })
      )
      .global('version', false)
      .group('help', 'Global Options:')
      .fail(handleError)
      .middleware(setupOpts)
      .middleware(setupLogger)
      .middleware(setupTelemetry)
      .commandDir('./cml')
      .commandDir('./legacy/commands')
      .command(
        '$0 <command>',
        false,
        (builder) => builder.strict(false),
        runPlugin
      )
      .recommendCommands()
      .demandCommand()
      .strict()
      .parse();

    const { telemetryEvent } = yargs.parsed.argv;
    await send({ event: telemetryEvent });
  } catch (err) {
    if (yargs.parsed.argv) {
      const { telemetryEvent } = yargs.parsed.argv;
      const event = { ...telemetryEvent, error: err.message };
      await send({ event });
    }
    logger.error(err);
    process.exit(1);
  }
})();
