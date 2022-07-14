const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');

const {
  repoOptions: { repo, driver }
} = require('../../src/cml');

exports.command = 'send-github-check <markdown file>';
exports.description = 'Create a check report';

exports.handler = async (opts) => {
  const { cml, telemetryEvent: event, markdownfile } = opts;
  const report = await fs.readFile(markdownfile, 'utf-8');
  await opts.cml.checkCreate({ ...opts, report });
  await cml.telemetrySend({ event });
};

exports.builder = (yargs) =>
  yargs.env('CML_SEND_GITHUB_CHECK').options(
    kebabcaseKeys({
      driver,
      token: {
        type: 'string',
        description:
          "GITHUB_TOKEN or Github App token. Personal access token won't work"
      },
      repo,
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
    })
  );
