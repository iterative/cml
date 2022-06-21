exports.command = 'repository';
exports.description = 'Manage repository settings';
exports.builder = (yargs) =>
  yargs
    .commandDir('./repository', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
