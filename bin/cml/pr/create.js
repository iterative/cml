const kebabcaseKeys = require('kebabcase-keys');

const {
  GIT_REMOTE,
  GIT_USER_NAME,
  GIT_USER_EMAIL
} = require('../../../src/cml');

const DESCRIPTION = 'Create a pull request (committing any given paths first)';

const DOCSURL = 'https://cml.dev/doc/ref/pr';

exports.command = 'create [glob path...]';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  const { cml, globpath: globs } = opts;
  const link = await cml.prCreate({ ...opts, globs });
  console.log(link);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_PR')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  md: {
    type: 'boolean',
    description: 'Output in markdown format [](url)'
  },
  skipCI: {
    type: 'boolean',
    description: 'Force skip CI for the created commit (if any)'
  },
  merge: {
    type: 'boolean',
    alias: 'auto-merge',
    conflicts: ['rebase', 'squash'],
    description: 'Try to merge the pull request upon creation'
  },
  rebase: {
    type: 'boolean',
    conflicts: ['merge', 'squash'],
    description: 'Try to rebase-merge the pull request upon creation'
  },
  squash: {
    type: 'boolean',
    conflicts: ['merge', 'rebase'],
    description: 'Try to squash-merge the pull request upon creation'
  },
  branch: {
    type: 'string',
    description: 'Pull request branch name'
  },
  targetBranch: {
    type: 'string',
    description: 'Pull request target branch name'
  },
  title: {
    type: 'string',
    description: 'Pull request title'
  },
  body: {
    type: 'string',
    description: 'Pull request description'
  },
  message: {
    type: 'string',
    description: 'Commit message'
  },
  remote: {
    type: 'string',
    default: GIT_REMOTE,
    description: 'Git remote'
  },
  userEmail: {
    type: 'string',
    default: GIT_USER_EMAIL,
    description: 'Git user email'
  },
  userName: {
    type: 'string',
    default: GIT_USER_NAME,
    description: 'Git user name'
  }
});
exports.DOCSURL = DOCSURL;
