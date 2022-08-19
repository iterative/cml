const { builder, handler } = require('../cml/asset/publish');

exports.command = 'publish <asset>';
exports.description = false;
exports.handler = handler;
exports.builder = builder;
