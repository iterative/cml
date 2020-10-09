#!/usr/bin/env node

console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');

const { head_sha: HEAD_SHA, handle_error, comment } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const run = async (opts) => {
  const { 'commit-sha': sha, 'head-sha': head_sha } = opts;
  const path = opts._[0];

  const file_content = await fs.readFile(path, 'utf-8');
  const watermark =
    '![CML watermark](https://raw.githubusercontent.com/iterative/cml/watermark-comment/assets/watermark.svg)';
  const report = `${file_content}
  
  ${watermark}
  `;

  await comment({ commit_sha: sha || head_sha || HEAD_SHA, report });
};

const argv = yargs
  .usage('Usage: $0 <path to markdown file>')
  .default('commit-sha')
  .describe(
    'commit-sha',
    'Commit SHA linked to this comment. Defaults to HEAD.'
  )
  .default('head-sha')
  .describe('head-sha', 'Commit SHA linked to this comment. Defaults to HEAD')
  .deprecateOption('head-sha', 'Use commit-sha instead')
  .help('h')
  .demand(1).argv;
run(argv).catch((e) => handle_error(e));
