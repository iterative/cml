const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');

const DESCRIPTION = 'Create a check report';
const DOCSURL = 'https://cml.dev/doc/ref/check';

exports.command = 'create <markdown file>';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  const { cml, markdownfile } = opts;
  const report = await fs.readFile(markdownfile, 'utf-8');
  await cml.checkCreate({ ...opts, report });
};

exports.builder = (yargs) =>
  yargs
    .env('CML_CHECK')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  token: {
    type: 'string',
    description:
      "GITHUB_TOKEN or Github App token. Personal access token won't work"
  },
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
exports.DOCSURL = DOCSURL;
