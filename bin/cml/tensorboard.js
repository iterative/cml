exports.command = 'tensorboard';
exports.description = 'Manage tensorboard.dev agents';
exports.builder = (yargs) =>
  yargs
    .commandDir('./tensorboard', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
