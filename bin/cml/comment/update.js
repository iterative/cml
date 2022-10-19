const { builder, handler } = require('./create');

const DESCRIPTION = 'Update a comment';
const DOCSURL = 'https://cml.dev/doc/ref/comment#update';

exports.command = 'update <markdown file>';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  await handler({ ...opts, update: true });
};

exports.builder = builder;
exports.DOCSURL = DOCSURL;
