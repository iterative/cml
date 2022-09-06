const { builder, handler } = require('../../cml/comment/create');

exports.command = 'send-comment <markdown file>';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
