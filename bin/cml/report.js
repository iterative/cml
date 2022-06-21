exports.command = 'report';
exports.description = 'Manage reports';
exports.builder = (yargs) =>
  yargs
    .commandDir('./report', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
