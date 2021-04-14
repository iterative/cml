#!/usr/bin/env node

console.log = console.error;

const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const CML = require('../src/cml');

const run = async (opts) => {
  const globs = opts['_'].len ? opts['_'] : undefined;
  const cml = new CML(opts);
  await cml.pr_create({ ...opts, globs });
};

const opts = decamelize(yargs
  .usage('Usage: $0 <path to markdown file>')
  .boolean('skip-ci')
  .describe(
    'skip-ci',
    'CI will be skipped adding [ci-skip] in the commit comment'
  )
  .boolean('new-pr')
  .describe(
    'skip-ci',
    'Will create a new PR instead of reusing a new one'
  )
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
  .help('h').argv);

run(opts).catch((e) => {
  console.error(e);
  process.exit(1);
});
