#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');
const { publish_file } = require('../src/report');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const run = async opts => {
  const { file, md, title } = opts;
  const path = opts._[0];

  const output = await publish_file({ path, md, title });
  if (!file) print(output);
  else await fs.writeFile(file, output);
};

const argv = yargs
  .usage(`Usage: $0 <path> --file <string>`)
  .default('file')
  .alias('f', 'file')
  .default('md')
  .default('title')
  .alias('t', 'title')
  .help('h')
  .demand(1).argv;
run(argv).catch(e => handle_error(e));
