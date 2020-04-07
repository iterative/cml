const util = require('util');
const git = require('simple-git/promise');

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  const { debug, throw_err = true } = opts || {};
  const { error, stdout, stderr } = await execp(command);

  if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

  if (throw_err && error) throw error;

  return stdout;
};

const randid = () => {
  return (
    Math.random()
      .toString(36)
      .substring(2, 7) +
    Math.random()
      .toString(36)
      .substring(2, 7)
  );
};

exports.exec = exec;
exports.randid = randid;
exports.git = git('./');
