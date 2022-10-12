const { deprecationNotice } = require('../deprecation');
const { builder, handler } = require('../../cml/workflow/rerun');

exports.command = 'rerun-workflow';
exports.description = false;
exports.handler = handler;
exports.builder = deprecationNotice({
  builder,
  notice: '"cml rerun-workflow" is deprecated, please use "cml workflow rerun"'
});
