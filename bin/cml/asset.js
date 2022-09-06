exports.command = 'asset';
exports.description = false;
exports.builder = (yargs) =>
  yargs
    .commandDir('./asset', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
