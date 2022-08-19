const { builder, handler } = require('../../cml/repository/configure');

exports.command = 'ci';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
