exports.command = 'workflow';
exports.description = 'Manage continuous integration workflows';
exports.builder = (yargs) =>
  yargs
    .commandDir('./workflow', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
