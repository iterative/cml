#!/usr/bin/env node

console.log = console.error;

const yargs = require('yargs');

const CML = require('../src/cml');

const run = async (opts) => {
  console.log(opts);
  const cml = new CML(opts);
  await cml.pr_create({});
};

const argv = yargs
  .usage('Usage: $0 <path to markdown file>')
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
  .default('driver')
  .choices('driver', ['github', 'gitlab'])
  .describe('driver', 'If not specify it infers it from the ENV.')
  .help('h').argv;

run(argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
