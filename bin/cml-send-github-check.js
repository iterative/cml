#!/usr/bin/env node

console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');

const { head_sha: HEAD_SHA, handle_error, create_check_report } = process.env
  .GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const run = async opts => {
  const { path, 'head-sha': head_sha = HEAD_SHA } = opts;
  const report = await fs.readFile(path, 'utf-8');

  await create_check_report({
    head_sha,
    report
  });
};

pipe_args.load();
const argv = yargs
  .usage(`Usage: $0 --path <string> --head-sha <string>`)
  .default('path')
  .alias('p', 'path')
  .default('head-sha')
  .help('h')
  .demandOption(['path']).argv;
run(argv).catch(e => handle_error(e));
