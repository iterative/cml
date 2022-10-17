const { addDeprecationNotice } = require('../deprecation');
const { builder, handler } = require('../../cml/check/create');

exports.command = 'send-github-check <markdown file>';
exports.description = false;
exports.handler = handler;
exports.builder = addDeprecationNotice({
  builder,
  notice: '"cml send-github-check" is deprecated, please use "cml check create"'
});
