const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const { spawn } = require('child_process');
const { homedir } = require('os');
const tempy = require('tempy');
const { logger } = require('../../../src/logger');

const { exec, watermarkUri, sleep } = require('../../../src/utils');
const yargs = require('yargs');

const tbLink = async (opts = {}) => {
  const { stdout, stderror, title, name, rmWatermark, md, timeout = 60 } = opts;

  let chrono = 0;
  const chronoStep = 2;
  while (chrono < timeout) {
    const data = await fs.readFile(stdout, 'utf8');
    const urls = data.match(/(https?:\/\/[^\s]+)/) || [];

    if (urls.length) {
      let [output] = urls;

      if (!rmWatermark) output = watermarkUri({ uri: output, type: 'tb' });
      if (md) output = `[${title || name}](${output})`;

      return output;
    }

    await sleep(chronoStep);
    chrono = chrono + chronoStep;
  }

  logger.error(await fs.readFile(stderror, 'utf8'));
  throw new Error(`Tensorboard took too long`);
};

const launchAndWaitLink = async (opts = {}) => {
  const { md, logdir, name, title, rmWatermark, extraParams } = opts;

  const command = `tensorboard dev upload --logdir ${logdir} ${extraParams}`;

  const stdoutPath = tempy.file({ extension: 'log' });
  const stdoutFd = await fs.open(stdoutPath, 'a');
  const stderrPath = tempy.file({ extension: 'log' });
  const stderrFd = await fs.open(stderrPath, 'a');

  const proc = spawn(command, [], {
    detached: true,
    shell: true,
    stdio: ['ignore', stdoutFd, stderrFd]
  });

  proc.unref();
  proc.on('exit', async (code, signal) => {
    if (code || signal) {
      logger.error(await fs.readFile(stderrPath, 'utf8'));
      throw new Error(`Tensorboard failed with error ${code || signal}`);
    }
  });

  const url = await exports.tbLink({
    stdout: stdoutPath,
    stderror: stderrPath,
    title,
    name,
    rmWatermark,
    md
  });

  stdoutFd.close();
  stderrFd.close();

  return url;
};

exports.tbLink = tbLink;

const DESCRIPTION = 'Connect to tensorboard.dev and get a link';
const DOCSURL = 'https://cml.dev/doc/ref/tensorboard';

exports.command = 'connect';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  if (new Date() > new Date('2024-01-01')) {
    logger.error('TensorBoard.dev has been shut down as of January 1, 2024');
    yargs.exit(1);
  }

  const { file, credentials, name, description } = opts;

  const path = `${homedir()}/.config/tensorboard/credentials`;
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(`${path}/uploader-creds.json`, credentials);

  const help = await exec('tensorboard', 'dev', 'upload', '-h');
  const extraParamsFound =
    (name || description) && help.indexOf('--description') >= 0;
  const extraParams = extraParamsFound
    ? `--name "${name}" --description "${description}"`
    : '';

  const url = await launchAndWaitLink({ ...opts, extraParams });
  if (!file) console.log(url);
  else await fs.appendFile(file, url);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_TENSORBOARD')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  credentials: {
    type: 'string',
    alias: 'c',
    required: true,
    description:
      'TensorBoard credentials as JSON, usually found at ~/.config/tensorboard/credentials/uploader-creds.json'
  },
  logdir: {
    type: 'string',
    description: 'Directory containing the logs to process'
  },
  name: {
    type: 'string',
    description: 'Tensorboard experiment title; max 100 characters'
  },
  description: {
    type: 'string',
    description:
      'Tensorboard experiment description in Markdown format; max 600 characters'
  },
  md: {
    type: 'boolean',
    description: 'Output as markdown [title || name](url)'
  },
  title: {
    type: 'string',
    alias: 't',
    description: 'Markdown title, if not specified, param name will be used'
  },
  file: {
    type: 'string',
    alias: 'f',
    description:
      'Append the output to the given file or create it if does not exist',
    hidden: true
  },
  rmWatermark: {
    type: 'boolean',
    description: 'Avoid CML watermark',
    hidden: true,
    telemetryData: 'name'
  }
});
exports.DOCSURL = DOCSURL;
