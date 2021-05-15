#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const CML = require('../src/cml');

const run = async (opts) => {
  const { data, file, repo, native } = opts;

  const path = opts._[0];
  const buffer = data ? Buffer.from(data, 'binary') : null;

  const cml = new CML({ ...opts, repo: native ? repo : 'cml' });
  const output = await cml.publish({
    ...opts,
    buffer,
    path
  });

  if (!file) print(output);
  else await fs.writeFile(file, output);
};

pipe_args.load('binary');
const data = pipe_args.piped_arg();
const opts = decamelize(
  yargs
    .strict()
    .usage(`Usage: $0 <path to file>`)
    .describe('md', 'Output in markdown format [title || name](url).')
    .boolean('md')
    .describe('md', 'Output in markdown format [title || name](url).')
    .default('title')
    .describe('title', 'Markdown title [title](url) or ![](url title).')
    .alias('title', 't')
    .describe(
      'native',
      "Uses driver's native capabilities to upload assets instead of CML's storage. Currently only available for GitLab CI."
    )
    .alias('native', 'gitlab-uploads')
    .boolean('rm-watermark')
    .describe('rm-watermark', 'Avoid CML watermark.')
    .default('mime-type')
    .describe(
      'mime-type',
      'Specifies the mime-type. If not set guess it from the content.'
    )
    .default('file')
    .describe(
      'file',
      'Append the output to the given file. Create it if does not exist.'
    )
    .alias('file', 'f')
    .default('repo')
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token')
    .describe(
      'token',
      'Personal access token to be used. If not specified, extracted from ENV REPO_TOKEN, GITLAB_TOKEN, GITHUB_TOKEN, or BITBUCKET_TOKEN.'
    )
    .default('driver')
    .choices('driver', ['github', 'gitlab'])
    .describe('driver', 'If not specify it infers it from the ENV.')
    .help('h')
    .demand(data ? 0 : 1).argv
);

run({ ...opts, data }).catch((e) => {
  console.error(e);
  process.exit(1);
});
