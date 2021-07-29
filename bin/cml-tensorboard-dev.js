#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { homedir } = require('os');
const tempy = require('tempy');

const { exec, watermarkUri } = require('../src/utils');

const { TB_CREDENTIALS } = process.env;

const closeFd = (fd) => {
  try {
    fd.close();
  } catch (err) {
    console.error(err.message);
  }
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
  proc.on('exit', (code) => {
    throw new Error(`Tensorboard process exited with code ${code}`);
  });

  // reads stdout every 5 secs to find the tb uri
  setInterval(async () => {
    console.log('1sec');
    const stdoutData = await fs.readFile(stdoutPath, 'utf8');
    const regex = /(https?:\/\/[^\s]+)/;
    const matches = stdoutData.match(regex);

    if (matches.length) {
      let output = matches[0];

      if (!rmWatermark) output = watermarkUri({ uri: output, type: 'tb' });

      if (md) output = `[${title || name}](${output})`;

      if (!file) print(output);
      else await fs.appendFile(file, output);

      closeFd(stdoutFd) && closeFd(stderrFd);
      process.exit(0);
    }
  }, 1 * 5 * 1000);

  // waits 1 min before dies
  setTimeout(async () => {
    console.log('here');
    closeFd(stdoutFd) && closeFd(stderrFd);
    console.error(await fs.readFile(stderrPath, 'utf8'));
    throw new Error('Tensorboard took too long! Canceled.');
  }, 1 * 60 * 1000);
};

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
