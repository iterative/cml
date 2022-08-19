const { builder, handler } = require('../../cml/tensorboard/start');

exports.command = 'tensorboard-dev';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
