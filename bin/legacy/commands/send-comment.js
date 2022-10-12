const { deprecationNotice } = require('../deprecation');
const { builder, handler } = require('../../cml/comment/create');

exports.command = 'send-comment <markdown file>';
exports.description = false;
exports.handler = handler;
exports.builder = deprecationNotice({
  builder,
  notice: '"cml send-comment" is deprecated, please use "cml comment create"'
});
