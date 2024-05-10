exports.command = 'tensorboard';
exports.description = false;
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
