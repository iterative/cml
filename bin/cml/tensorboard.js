exports.command = 'tensorboard';
exports.description = 'Manage tensorboard.dev agents';
exports.builder = (yargs) =>
  yargs
    .options({
      driver: { hidden: true },
      repo: { hidden: true },
      token: { hidden: true }
    })
    .commandDir('./tensorboard', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
