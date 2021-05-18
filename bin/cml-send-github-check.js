#!/usr/bin/env node

console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');

const CML = require('../src/cml').default;
const CHECK_TITLE = 'CML Report';

const run = async (opts) => {
  const { 'head-sha': head_sha, conclusion, title } = opts;
  const path = opts._[0];
  const report = await fs.readFile(path, 'utf-8');

  const cml = new CML({ ...opts, driver: 'github' });
  await cml.check_create({ head_sha, report, conclusion, title });
};

const argv = yargs
  .strict()
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
  .default('repo')
  .describe(
    'repo',
    'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
  )
  .default('token')
  .describe(
    'token',
    'Personal access token to be used. If not specified in extracted from ENV REPO_TOKEN.'
  )
  .help('h')
  .demand(1).argv;

run(argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
