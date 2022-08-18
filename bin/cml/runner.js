const { options, handler } = require('./runner/start');

exports.command = 'runner';
exports.description = 'Manage self-hosted (cloud & on-premise) CI runners';
exports.handler = handler;
exports.builder = (yargs) =>
  yargs
    .commandDir('./runner', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .env('CML_RUNNER')
    .options(options)
    .check(() => process.argv.some((arg) => arg.startsWith('-')))
    .strict();
