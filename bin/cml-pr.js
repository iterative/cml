#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');

const CML = require('../src/cml').default;
const { GIT_REMOTE, GIT_USER_NAME, GIT_USER_EMAIL } = require('../src/cml');

const run = async (opts) => {
  const globs = opts._.length ? opts._ : undefined;
  const cml = new CML(opts);
  print((await cml.prCreate({ ...opts, globs })) || '');
};

const opts = yargs
  .strict()
  .usage('Usage: $0 <glob path> ... <glob path>')
  .describe('md', 'Output in markdown format [](url).')
  .boolean('md')
  .default('remote', GIT_REMOTE)
  .describe('remote', 'Sets git remote.')
  .default('user-email', GIT_USER_EMAIL)
  .describe('user-email', 'Sets git user email.')
  .default('user-name', GIT_USER_NAME)
  .describe('user-name', 'Sets git user name.')
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
  .default('driver')
  .choices('driver', ['github', 'gitlab'])
  .describe('driver', 'If not specify it infers it from the ENV.')
  .help('h').argv;
run(opts).catch((e) => {
  console.error(e);
  process.exit(1);
});
