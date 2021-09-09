const { GIT_REMOTE, GIT_USER_NAME, GIT_USER_EMAIL } = require('../../src/cml');
const CML = require('../../src/cml').default;

exports.command = 'pr <glob path...>';
exports.desc = 'Create a pull request with the specified files';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  const link = await cml.prCreate({ ...opts, globs: opts.globpath });
  if (link) console.log(link);
};

exports.builder = (yargs) =>
  yargs
    .describe('md', 'Output in markdown format [](url).')
    .boolean('md')
    .default('remote', GIT_REMOTE)
    .describe('remote', 'Sets git remote.')
    .default('user-email', GIT_USER_EMAIL)
    .describe('user-email', 'Sets git user email.')
    .default('user-name', GIT_USER_NAME)
    .describe('user-name', 'Sets git user name.')
    .default('repo')
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token')
    .describe(
      'token',
      'Personal access token to be used. If not specified in extracted from ENV REPO_TOKEN.'
    )
    .default('driver')
    .choices('driver', ['github', 'gitlab'])
    .describe('driver', 'If not specify it infers it from the ENV.');
