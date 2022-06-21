exports.command = 'check';
exports.description = 'Manage continuous integration checks';
exports.builder = (yargs) =>
  yargs
    .commandDir('./check', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
