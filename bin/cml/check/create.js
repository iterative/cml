const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const CML = require('../../../src/cml').default;

exports.command = 'create <markdown file>';
exports.description = 'Create a check report';

exports.handler = async (opts) => {
  const path = opts.markdownfile;
  const report = await fs.readFile(path, 'utf-8');
  const cml = new CML({ ...opts });
  await cml.checkCreate({ ...opts, report });
};

exports.builder = (yargs) =>
  yargs.env('CML_SEND_GITHUB_CHECK').options(exports.options);

exports.options = kebabcaseKeys({
  commitSha: {
    type: 'string',
    alias: 'head-sha',
    defaultDescription: 'HEAD',
    description: 'Commit SHA linked to this comment'
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
    description: 'Conclusion status of the check'
  },
  status: {
    type: 'string',
    choices: ['queued', 'in_progress', 'completed'],
    default: 'completed',
    description: 'Status of the check'
  },
  title: {
    type: 'string',
    default: 'CML Report',
    description: 'Title of the check'
  }
});
