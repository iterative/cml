const kebabcaseKeys = require('kebabcase-keys');

const {
  GIT_REMOTE,
  GIT_USER_NAME,
  GIT_USER_EMAIL
} = require('../../../src/cml');

exports.command = 'create <glob path...>';
exports.description = 'Create a pull request with the specified files';

exports.handler = async (opts) => {
  const { cml, globpath: globs } = opts;
  const link = await cml.prCreate({ ...opts, globs });
  console.log(link);
};

exports.builder = (yargs) => yargs.env('CML_PR').options(exports.options);

exports.options = kebabcaseKeys({
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
    description: 'Branch name for the pull request.'
  },
  title: {
    type: 'string',
    description: 'Pull request title.'
  },
  body: {
    type: 'string',
    description: 'Pull request description.'
  },
  message: {
    type: 'string',
    description: 'Commit message.'
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
  }
});
