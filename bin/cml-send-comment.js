#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const fs = require('fs').promises;
const yargs = require('yargs');
const { hash } = require('../src/utils');
const { publish_file } = require('../src/report');

const {
  head_sha: HEAD_SHA,
  handle_error,
  comment,
  commit_comments,
  pull_request_comments,
  is_pr
} = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const run = async (opts) => {
  const { 'commit-sha': sha, 'head-sha': head_sha } = opts;
  const path = opts._[0];
  const watermark = await publish_file({
    buffer:
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1" fill="#ffffff"></svg>',
    title: 'CML watermark',
    md: true
  });

  const file_content = await fs.readFile(path, 'utf-8');
  const report = `${file_content}
  
  ${watermark}
  `;
  const commit_sha = sha || head_sha || HEAD_SHA;

  const comments =
    (await (is_pr
      ? pull_request_comments()
      : commit_comments({ commit_sha }))) || [];
  const do_comment = comments.filter(
    (comment) => hash(comment.body) === hash(report)
  );

  if (do_comment) await comment({ commit_sha, report });
  else print('Comment was skipped. Already exists in the context.');
};

const argv = yargs
  .usage(`Usage: $0 <path> --head-sha <string>`)
  .default('commit-sha')
  .describe('commit-sha', 'Commit sha')
  .default('head-sha')
  .describe('head-sha', 'Commit sha')
  .deprecateOption('head-sha', 'Use commit-sha instead')
  .help('h')
  .demand(1).argv;
run(argv).catch((e) => handle_error(e));
