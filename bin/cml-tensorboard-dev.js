#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { homedir } = require('os');
const tempy = require('tempy');
const { exec } = require('../src/utils');

const { handle_error } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const { TB_CREDENTIALS } = process.env;

const close_fd = (fd) => {
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
    title
  } = opts;

  // set credentials
  const path = `${homedir()}/.config/tensorboard/credentials`;
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(`${path}/uploader-creds.json`, credentials);

  // launch  tensorboard on background
  const help = await exec('tensorboard dev upload -h');
  const extra_params_found =
    (name || description) && help.indexOf('--description') >= 0;
  const extra_params = extra_params_found
    ? `--name "${name}" --description "${description}"`
    : '';

  const command = `tensorboard dev upload --logdir ${logdir} ${extra_params}`;
  const stdout_path = tempy.file({ extension: 'log' });
  const stdout_fd = await fs.open(stdout_path, 'a');
  const stderr_path = tempy.file({ extension: 'log' });
  const stderr_fd = await fs.open(stderr_path, 'a');
  const proc = spawn(command, [], {
    detached: true,
    shell: true,
    stdio: ['ignore', stdout_fd, stderr_fd]
  });

  proc.unref();
  proc.on('exit', (code) => {
    throw new Error(`Tensorboard process exited with code ${code}`);
  });

  // reads stdout every 5 secs to find the tb uri
  setInterval(async () => {
    const stdout_data = await fs.readFile(stdout_path, 'utf8');
    const regex = /(https?:\/\/[^\s]+)/;
    const matches = stdout_data.match(regex);

    if (matches.length) {
      let output = matches[0];

      if (md) output = `[${title || name}](${output})`;

      if (!file) print(output);
      else await fs.appendFile(file, output);

      close_fd(stdout_fd) && close_fd(stderr_fd);
      process.exit(0);
    }
  }, 1 * 5 * 1000);

  // waits 1 min before dies
  setTimeout(async () => {
    close_fd(stdout_fd) && close_fd(stderr_fd);
    console.error(await fs.readFile(stderr_path, 'utf8'));
    throw new Error('Tensorboard took too long! Canceled.');
  }, 1 * 60 * 1000);
};

const argv = yargs
  .usage(`Usage: $0 <path> --file <string>`)
  .default('credentials')
  .alias('c', 'credentials')
  .default('logdir', '', 'Directory containing the logs to process.')
  .default('name', '', 'Tensorboard experiment title. Max 100 characters.')
  .default(
    'description',
    '',
    'Tensorboard experiment description. Markdown format. Max 600 characters.'
  )
  .default('plugins', null, '')
  .boolean('md')
  .describe('md', 'Markdown output with the form [title || name](url).')
  .default(
    'title',
    null,
    'Title of markdown, if not specified, name will be used.'
  )
  .default(
    'file',
    null,
    'Append the output to the given file. Create it if does not exists.'
  )
  .alias('file', 'f')
  .help('h').argv;

run(argv).catch((e) => handle_error(e));
