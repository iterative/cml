const { options, handler } = require('./runner/start');

exports.command = 'runner';
exports.description = 'Manage continuous integration self-hosted runners';
exports.handler = handler;
exports.builder = (yargs) =>
  yargs
    .commandDir('./runner', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .env('CML_RUNNER')
    .options(options)
    .strict();
