const { builder, handler } = require('../../cml/tensorboard/connect');

exports.command = 'tensorboard-dev';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
