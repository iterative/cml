#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { homedir } = require('os');
const { exec } = require('../src/utils');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const { TB_CREDENTIALS } = process.env;

const run = async opts => {
  const { md, file, credentials = TB_CREDENTIALS, logdir, name } = opts;

  const path = `${homedir()}/.config/tensorboard/credentials`;
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(`${path}/uploader-creds.json`, credentials);

  const tb_path = await exec('which tensorboard');
  const command = `python -u ${tb_path} dev upload --logdir ${logdir}`;
  console.error(command);

  const proc = spawn(command, {
    detached: true,
    shell: true
  });

  proc.stderr.on('data', data => {
    data && console.error(data.toString('utf8'));
  });

  proc.stdout.on('data', async data => {
    if (data) {
      let output = data.toString('utf8');
      output = output.substring(
        output.indexOf('https://', 0),
        output.length - 1
      );

      if (md) output = `[${name}](${output})`;

      if (!file) print(output);
      else await fs.writeFile(file, output);

      process.exit(0);
    }
  });
  proc.unref();
};

const argv = yargs
  .usage(`Usage: $0 <path>`)
  .default('credentials')
  .alias('c', 'credentials')
  .default('logdir', '', 'Directory containing the logs to process')
  .default('name', '', 'Title of the experiment. Max 100 characters.')
  .default(
    'description',
    '',
    'Experiment description. Markdown format. Max 600 characters.'
  )
  .default('plugins')
  .boolean('md')
  .alias('name', 'title')
  .alias('t', 'title')
  .help('h').argv;
run(argv).catch(e => handle_error(e));
