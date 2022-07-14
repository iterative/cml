const kebabcaseKeys = require('kebabcase-keys');

const { GIT_USER_NAME, GIT_USER_EMAIL, repoOptions } = require('../../src/cml');

exports.command = 'ci';
exports.description = 'Fixes specific CI setups';

exports.handler = async (opts) => {
  const { cml, telemetryEvent: event } = opts;
  await cml.ci(opts);
  await cml.telemetrySend({ event });
};

exports.builder = (yargs) =>
  yargs.env('CML_CI').options(
    kebabcaseKeys({
      ...repoOptions,
      unshallow: {
        type: 'boolean',
        description:
          'Fetch as much as possible, converting a shallow repository to a complete one.'
      },
      userEmail: {
        type: 'string',
        default: GIT_USER_EMAIL,
        description: 'Set Git user email.'
      },
      userName: {
        type: 'string',
        default: GIT_USER_NAME,
        description: 'Set Git user name.'
      }
    })
  );
