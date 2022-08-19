const kebabcaseKeys = require('kebabcase-keys');

const { GIT_USER_NAME, GIT_USER_EMAIL } = require('../../../src/cml');

exports.command = 'configure';
exports.description = 'Configure the cloned repository';

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.ci(opts);
};

exports.builder = (yargs) =>
  yargs.env('CML_REPOSITORY').options(exports.options);

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
