const kebabcaseKeys = require('kebabcase-keys');

const { GIT_REMOTE, GIT_USER_NAME, GIT_USER_EMAIL } = require('../../src/cml');
const CML = require('../../src/cml').default;

exports.command = 'pr <glob path...>';
exports.description = 'Create a pull request with the specified files';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  const link = await cml.prCreate({ ...opts, globs: opts.globpath });
  if (link) console.log(link);
};

exports.builder = (yargs) =>
  yargs.env('CML_PR').options(
    kebabcaseKeys({
      md: {
        type: 'boolean',
        description: 'Output in markdown format [](url).'
      },
      skipCI: {
        type: 'boolean',
        description: 'Force skip CI for the created commit (if any)'
      },
      merge: {
        type: 'boolean',
        alias: 'auto-merge',
        conflicts: ['rebase', 'squash'],
        description: 'Try to merge the pull request upon creation.'
      },
      rebase: {
        type: 'boolean',
        conflicts: ['merge', 'squash'],
        description: 'Try to rebase-merge the pull request upon creation.'
      },
      squash: {
        type: 'boolean',
        conflicts: ['merge', 'rebase'],
        description: 'Try to squash-merge the pull request upon creation.'
      },
      branch: {
        type: 'string',
        description: 'set Custom branch name for pull request'
      },
      title: {
        type: 'string',
        description: 'Title of the created pull request'
      },
      body: {
        type: 'string',
        description:
          'Description/body of created pull request [string or file]. Ex "My cml pr", "reports/experiment-results.md"'
      },
      message: {
        type: 'string',
        description:
          'commit message for the new commit used to open the pull request'
      },
      remote: {
        type: 'string',
        default: GIT_REMOTE,
        description: 'Sets git remote.'
      },
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
