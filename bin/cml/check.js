exports.command = 'check';
exports.description = 'Manage CI checks';
exports.builder = (yargs) =>
  yargs
    .commandDir('./check', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
