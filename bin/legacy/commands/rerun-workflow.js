const { addDeprecationNotice } = require('../deprecation');
const { builder, handler } = require('../../cml/workflow/rerun');

exports.command = 'rerun-workflow';
exports.description = false;
exports.handler = handler;
exports.builder = addDeprecationNotice({
  builder,
  notice: '"cml rerun-workflow" is deprecated, please use "cml workflow rerun"'
});
