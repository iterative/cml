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
      userEmail: {
        type: 'string',
        default: GIT_USER_EMAIL,
        description: 'Sets git user email.'
      },
      userName: {
        type: 'string',
        default: GIT_USER_NAME,
        description: 'Sets git user name.'
      },
      repo: {
        type: 'string',
        description:
          'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
      },
      token: {
        type: 'string',
        description:
          'Personal access token to be used. If not specified in extracted from ENV REPO_TOKEN.'
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab', 'bitbucket'],
        description: 'If not specify it infers it from the ENV.'
      }
    })
  );
