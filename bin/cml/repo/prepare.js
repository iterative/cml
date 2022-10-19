const kebabcaseKeys = require('kebabcase-keys');

const { GIT_USER_NAME, GIT_USER_EMAIL } = require('../../../src/cml');

const DESCRIPTION = 'Prepare the cloned repository';
const DOCSURL = 'https://cml.dev/doc/ref/ci';

exports.command = 'prepare';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.ci(opts);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_REPO')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  fetchDepth: {
    type: 'number',
    default: 1,
    coerce: (val) => (val < 0 ? 0 : val),
    description:
      'Number of commits to fetch. 0 indicates all history for all branches and tags'
  },
  unshallow: {
    type: 'boolean',
    description:
      'Fetch as much as possible, converting a shallow repository to a complete one',
    hidden: true
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
