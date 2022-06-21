const { builder, handler } = require('../cml/attachment/publish');

exports.command = 'publish <asset>';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
