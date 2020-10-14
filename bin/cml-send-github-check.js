#!/usr/bin/env node

console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');

const CML = require('../src/cml');
const CHECK_TITLE = 'CML Report';

const run = async (opts) => {
  const { 'head-sha': head_sha, conclusion, title } = opts;
  const path = opts._[0];
  const report = await fs.readFile(path, 'utf-8');

  const cml = new CML(opts);
  await cml.check_create({ head_sha, report, conclusion, title });
};

const argv = yargs
  .usage('Usage: $0 <path to markdown file>')
  .default('head-sha')
  .describe(
    'head-sha',
    'Commit sha where the comment will appear. Defaults to HEAD.'
  )
  .default('conclusion', 'success', 'Sets the conclusion status of the check.')
  .choices('conclusion', [
    'success',
    'failure',
    'neutral',
    'cancelled',
    'skipped',
    'timed_out'
  ])
  .default('title', CHECK_TITLE)
  .describe('title', 'Sets title of the check.')
  .help('h')
  .demand(1).argv;

run(argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
