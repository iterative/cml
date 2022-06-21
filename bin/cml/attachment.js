exports.command = 'attachment';
exports.description = false;
exports.builder = (yargs) =>
  yargs
    .commandDir('./attachment', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
