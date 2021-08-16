#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { homedir } = require('os');
const tempy = require('tempy');

const { exec, watermarkUri, sleep } = require('../src/utils');

const { TB_CREDENTIALS } = process.env;
const isCLI = require.main === module;

const closeFd = (fd) => {
  try {
    fd.close();
  } catch (err) {
    console.error(err.message);
  }
};

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

  const error = await fs.readFile(stderror, 'utf8');
  throw new Error(`Tensorboard took too long. ${error}`);
};

const run = async (opts) => {
  const {
    md,
    file,
    credentials = TB_CREDENTIALS,
    logdir,
    name,
    description,
    title,
    rmWatermark
  } = opts;

  // set credentials
  const path = `${homedir()}/.config/tensorboard/credentials`;
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(`${path}/uploader-creds.json`, credentials);

  // launch  tensorboard on background
  const help = await exec('tensorboard dev upload -h');
  const extraParamsFound =
    (name || description) && help.indexOf('--description') >= 0;
  const extraParams = extraParamsFound
    ? `--name "${name}" --description "${description}"`
    : '';
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
  proc.on('exit', async (code) => {
    if (code) {
      const error = await fs.readFile(stderrPath, 'utf8');
      print(`Tensorboard failed with error: ${error}`);
    }
    process.exit(code);
  });

  const url = await tbLink({
    stdout: stdoutPath,
    stderror: stderrPath,
    title,
    name,
    rmWatermark,
    md
  });
  if (!file) print(url);
  else await fs.appendFile(file, url);

  closeFd(stdoutFd) && closeFd(stderrFd);
  process.exit(0);
};

if (isCLI) {
  const argv = yargs
    .strict()
    .usage(`Usage: $0`)
    .default('credentials')
    .describe(
      'credentials',
      'TB credentials as json. Usually found at ~/.config/tensorboard/credentials/uploader-creds.json. If not specified will look for the json at the env variable TB_CREDENTIALS.'
    )
    .alias('credentials', 'c')
    .default('logdir')
    .describe('logdir', 'Directory containing the logs to process.')
    .default('name')
    .describe('name', 'Tensorboard experiment title. Max 100 characters.')
    .default('description')
    .describe(
      'description',
      'Tensorboard experiment description. Markdown format. Max 600 characters.'
    )
    .default('plugins')
    .boolean('md')
    .describe('md', 'Output as markdown [title || name](url).')
    .default('title')
    .describe(
      'title',
      'Markdown title, if not specified, param name will be used.'
    )
    .alias('title', 't')
    .default('file')
    .describe(
      'file',
      'Append the output to the given file. Create it if does not exist.'
    )
    .describe('rm-watermark', 'Avoid CML watermark.')
    .alias('file', 'f')
    .help('h').argv;

  run(argv).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}

module.exports = {
  tbLink
};
