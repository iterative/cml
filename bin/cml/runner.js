const { options, handler } = require('./runner/launch');

exports.command = 'runner';
exports.description = 'Manage self-hosted (cloud & on-premise) CI runners';
exports.handler = handler;
exports.builder = (yargs) =>
  yargs
    .commandDir('./runner', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .env('CML_RUNNER')
    .options(
      Object.fromEntries(
        Object.entries(options).map(([key, value]) => [
          key,
          { ...value, hidden: true, global: false }
        ])
      )
    )
    .option('options', { default: options, hidden: true })
    .check(() => process.argv.some((arg) => arg.startsWith('-')))
    .strict();
