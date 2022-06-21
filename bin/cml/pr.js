const { options, handler } = require('./pr/create');

exports.command = 'pr';
exports.description = 'Manage pull requests';
exports.handler = handler;
exports.builder = (yargs) =>
  yargs
    .commandDir('./pr', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .env('CML_PR')
    .options(options)
    .strict();
