#!/usr/bin/env node

console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');

const CML = require('../src/cml');

const run = async (opts) => {
  console.error(process.env);
  const { 'commit-sha': sha, 'head-sha': head_sha } = opts;
  const path = opts._[0];
  const report = await fs.readFile(path, 'utf-8');

  const cml = new CML(opts);
  await cml.comment_create({ report, commit_sha: sha || head_sha });
};

const argv = yargs
  .usage('Usage: $0 <path to markdown file>')
  .default('commit-sha')
  .describe(
    'commit-sha',
    'Commit SHA linked to this comment. Defaults to HEAD.'
  )
  .default('head-sha')
  .describe('head-sha', 'Commit SHA linked to this comment. Defaults to HEAD.')
  .deprecateOption('head-sha', 'Use commit-sha instead')
  .default('repo')
  .describe(
    'repo',
    'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
  )
  .default('token')
  .describe(
    'token',
    'Personal access token to be used. If not specified in extracted from ENV repo_token.'
  )
  .help('h')
  .demand(1).argv;

run(argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
