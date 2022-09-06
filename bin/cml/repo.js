exports.command = 'repo';
exports.description = false;
exports.builder = (yargs) =>
  yargs
    .commandDir('./repo', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
