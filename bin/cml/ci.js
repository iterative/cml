const kebabcaseKeys = require('kebabcase-keys');

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
