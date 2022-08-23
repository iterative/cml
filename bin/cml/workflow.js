exports.command = 'workflow';
exports.description = 'Manage CI workflows';
exports.builder = (yargs) =>
  yargs
    .commandDir('./workflow', { exclude: /\.test\.js$/ })
    .recommendCommands()
    .demandCommand()
    .strict();
