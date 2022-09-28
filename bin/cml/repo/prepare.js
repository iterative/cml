const kebabcaseKeys = require('kebabcase-keys');

const { GIT_USER_NAME, GIT_USER_EMAIL } = require('../../../src/cml');

exports.command = 'prepare';
exports.description = 'Prepare the cloned repository';

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.ci(opts);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_REPO')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options)
    .options(exports.options);

exports.options = kebabcaseKeys({
  unshallow: {
    type: 'boolean',
    description:
      'Fetch as much as possible, converting a shallow repository to a complete one'
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
