const util = require('util');
const git = require('simple-git/promise');

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  const { debug, throw_err = true } = opts || {};
  const { stdout, stderr } = await execp(command);

  if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

  if (throw_err && stderr) throw new Error(stderr);

  return stdout;
};

exports.exec = exec;
exports.git = git('./');
