const { options, handler } = require('./pr/create');

exports.command = 'pr <glob path...>';
exports.description = 'Manage pull requests';
exports.handler = handler;
exports.builder = (yargs) =>
  yargs
    .commandDir('./pr', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .env('CML_PR')
    .options(
      Object.fromEntries(
        Object.entries(options).map(([key, value]) => [
          key,
          { ...value, hidden: true, global: false }
        ])
      )
    )
    .option('options', { default: options, hidden: true })
    .strict();
