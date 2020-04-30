#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');
const { publish_vega } = require('../src/report');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const run = async opts => {
  const { vega, file, md } = opts;
  const data = JSON.parse(vega);
  const output = await publish_vega({ data, md });

  if (!file) print(output);
  else await fs.writeFile(file, output);
};

pipe_args.load();
const argv = yargs
  .usage(`Usage: $0 --vega <json> --file <string>`)
  .default('vega', pipe_args.piped_arg())
  .alias('m', 'vega')
  .default('file')
  .alias('f', 'file')
  .default('md', false)
  .help('h').argv;
run(argv).catch(e => handle_error(e));
