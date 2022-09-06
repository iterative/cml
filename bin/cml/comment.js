exports.command = 'comment';
exports.description = 'Manage comments';
exports.builder = (yargs) =>
  yargs
    .commandDir('./comment', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
