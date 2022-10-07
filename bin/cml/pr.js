const { options, handler } = require('./pr/create');

exports.command = 'pr';
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
    .check(({ globpath }) => globpath)
    .strict();
