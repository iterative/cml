const { addDeprecationNotice } = require('../deprecation');
const { builder, handler } = require('../../cml/repo/prepare');

exports.command = 'ci';
exports.description = 'Prepare Git repository for CML operations';
exports.handler = handler;
exports.builder = addDeprecationNotice({
  builder,
  notice: '"cml ci" is deprecated, please use "cml repo prepare"'
});
