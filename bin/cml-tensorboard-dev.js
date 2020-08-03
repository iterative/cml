#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const fs = require('fs').promises;
const { spawn } = require('child_process');
const { homedir } = require('os');
const { exec } = require('../src/utils');

const { handle_error } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const { TB_CREDENTIALS } = process.env;

const run = async opts => {
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
  const tb_path = await exec('which tensorboard');
  const help = await exec('tensorboard dev upload -h');
  const extra_params_found =
    (name || description) && help.indexOf('--description') >= 0;
  const extra_params = extra_params_found
    ? `--name "${name}" --description "${description}"`
    : '';
  const command = `python -u ${tb_path} dev upload --logdir ${logdir} ${extra_params}`;

  const proc = spawn(command, {
    detached: true,
    shell: true
  });

  proc.stderr.on('data', data => {
    data && console.error(data.toString('utf8'));
  });

  let output = '';
  proc.stdout.on('data', async data => {
    if (data) {
      console.error(data.toString('utf8'));

      output += data.toString('utf8');

      const uri_index = output.indexOf('https://', 0);
      if (uri_index > -1) {
        output = output.substring(uri_index, output.length - 1);

        if (md) output = `[${title || name}](${output})`;

        if (!file) print(output);
        else await fs.writeFile(file, output);

        process.exit(0);
      }
    }
  });

  proc.on('exit', code => {
    console.error(output);
    throw new Error(`Tensorboard process exited with code ${code}`);
  });

  proc.unref();

  setTimeout(() => {
    // waits 1 min before dies
    throw new Error('Tensorboard took too long! Canceled.');
  }, 1 * 60 * 1000);
};

const argv = yargs
  .usage(`Usage: $0 <path> --file <string>`)
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
  .default('title')
  .alias('t', 'title')
  .default('file')
  .alias('f', 'file')
  .help('h').argv;

run(argv).catch(e => handle_error(e));
