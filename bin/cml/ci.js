const kebabcaseKeys = require('kebabcase-keys');

const { GIT_USER_NAME, GIT_USER_EMAIL } = require('../../src/cml');
const CML = require('../../src/cml').default;

exports.command = 'ci';
exports.description = 'Fixes specific CI setups';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  console.log((await cml.ci(opts)) || '');
};

exports.builder = (yargs) =>
  yargs.env('CML_CI').options(
    kebabcaseKeys({
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
      },
      repo: {
        type: 'string',
        description:
          'Set repository to be used. If unspecified, inferred from the environment.'
      },
      token: {
        type: 'string',
        description:
          'Personal access token to be used. If unspecified, inferred from the environment.'
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab', 'bitbucket'],
        description: 'If unspecified, inferred from the environment.'
      }
    })
  );
