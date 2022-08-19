const { builder, handler } = require('../../cml/workflow/restart');

exports.command = 'rerun-workflow';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
