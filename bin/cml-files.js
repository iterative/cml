#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');
const REPORT = require('../src/report');

const run = async opts => {
  const { metrics = '{}', file, maxchars } = opts;
  const metrics_parsed = JSON.parse(metrics);
  const output = REPORT.dvc_diff_report_md(metrics_parsed, maxchars);

  if (!file) print(output);
  else await fs.writeFile(file, output);
};

pipe_args.load();
const argv = yargs
  .usage(`Usage: $0 --metrics <json> --file <string>`)
  .default('metrics', pipe_args.piped_arg())
  .alias('m', 'metrics')
  .default('file')
  .alias('f', 'file')
  .default('maxchars', 20000)
  .help('h').argv;
run(argv).catch(e => handle_error(e));
