#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');
const { publish_file } = require('../src/report');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const run = async opts => {
  const { file, md, title } = opts;
  const path = opts._[0];

  let buffer;
  if (data) buffer = Buffer.from(data, 'binary');

  const output = await publish_file({ path, buffer, md, title });
  if (!file) print(output);
  else await fs.writeFile(file, output);
};

pipe_args.load('binary');
const data = pipe_args.piped_arg();
const argv = yargs
  .usage(`Usage: $0 <path>`)
  .boolean('md')
  .default('title')
  .alias('t', 'title')
  .help('h')
  .demand(data ? 0 : 1).argv;
run({ ...argv, data }).catch(e => handle_error(e));
