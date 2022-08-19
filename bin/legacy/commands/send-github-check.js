const { builder, handler } = require('../../cml/check/create');

exports.command = 'send-github-check <markdown file>';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
