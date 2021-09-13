const fs = require('fs').promises;
const CML = require('../../src/cml').default;
const CHECK_TITLE = 'CML Report';

exports.command = 'send-github-check <markdown file>';
exports.desc = 'Create a check report';

exports.handler = async (opts) => {
  const path = opts.markdownfile;
  const report = await fs.readFile(path, 'utf-8');
  const cml = new CML({ ...opts });
  await cml.checkCreate({ ...opts, report });
};

exports.builder = (yargs) =>
  yargs
    .describe(
      'commit-sha',
      'Commit SHA linked to this comment. Defaults to HEAD.'
    )
    .alias('commit-sha', 'head-sha')
    .default(
      'conclusion',
      'success',
      'Sets the conclusion status of the check.'
    )
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
    );
