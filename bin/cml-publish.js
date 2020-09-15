#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');
const { publish_file } = require('../src/report');

const { GITHUB_ACTIONS } = process.env;

const { handle_error } = GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const run = async (opts) => {
  const { data, file } = opts;
  let { 'gitlab-uploads': gitlab_uploads } = opts;
  const path = opts._[0];

  let buffer;
  if (data) buffer = Buffer.from(data, 'binary');

  if (GITHUB_ACTIONS && gitlab_uploads) {
    console.error(`
    *****************************************
    * gitlab_uploads is only for gitlab!    *
    * ***************************************
    `);

    gitlab_uploads = false;
  }

  const output = await publish_file({ buffer, path, ...opts });

  if (!file) print(output);
  else await fs.writeFile(file, output);
};

pipe_args.load('binary');
const data = pipe_args.piped_arg();
const argv = yargs
  .usage(`Usage: $0 <path> --file <string>`)
  .boolean('md')
  .default('title')
  .alias('t', 'title')
  .default('file')
  .alias('f', 'file')
  .boolean('gitlab-uploads')
  .help('h')
  .demand(data ? 0 : 1).argv;
run({ ...argv, data }).catch((e) => handle_error(e));
