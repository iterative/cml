const { builder, handler } = require('./create');

exports.command = 'update <markdown file>';
exports.description = 'Update a comment';

exports.handler = async (opts) => {
  await handler({ ...opts, update: true });
};

exports.builder = builder;
