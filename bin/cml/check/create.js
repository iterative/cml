const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');

const { repoOptions } = require('../../../src/cml');

exports.command = 'create <markdown file>';
exports.description = 'Create a check report';

exports.handler = async (opts) => {
  const { cml, markdownfile } = opts;
  const report = await fs.readFile(markdownfile, 'utf-8');
  await cml.checkCreate({ ...opts, report });
};

exports.builder = (yargs) => yargs.env('CML_CHECK').options(exports.options);

exports.options = kebabcaseKeys({
  ...repoOptions,
  token: {
    type: 'string',
    description:
      "GITHUB_TOKEN or Github App token. Personal access token won't work"
  },
  commitSha: {
    type: 'string',
    alias: 'head-sha',
    description: 'Commit SHA linked to this comment. Defaults to HEAD.'
  },
  conclusion: {
    type: 'string',
    choices: [
      'success',
      'failure',
      'neutral',
      'cancelled',
      'skipped',
      'timed_out'
    ],
    default: 'success',
    description: 'Sets the conclusion status of the check.'
  },
  status: {
    type: 'string',
    choices: ['queued', 'in_progress', 'completed'],
    default: 'completed',
    description: 'Sets the status of the check.'
  },
  title: {
    type: 'string',
    default: 'CML Report',
    description: 'Sets title of the check.'
  }
});
