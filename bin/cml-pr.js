#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const CML = require('../src/cml');

const run = async (opts) => {
  const globs = opts._.length ? opts._ : undefined;
  const cml = new CML(opts);
  print((await cml.pr_create({ ...opts, globs })) || '');
};

const opts = decamelize(
  yargs
    .usage('Usage: $0 <glob path> ... <glob path>')
    .describe('md', 'Output in markdown format [](url).')
    .boolean('md')
    .default('git-remote', 'origin')
    .default('git-user-email', 'olivaw@iterative.ai')
    .default('git-user-name', 'iterative-olivaw')
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
    .help('h').argv
);

run(opts).catch((e) => {
  console.error(e);
  process.exit(1);
});
