const util = require('util');
const fs = require('fs').promises;
const path = require('path');
const git = require('simple-git/promise');

fs.exists = async file => {
  try {
    await fs.access(file, fs.F_OK);
  } catch (err) {
    return false;
  }

  return true;
};

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  const { debug, throw_err = true } = opts || {};
  const { stdout, stderr } = await execp(command);

  if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

  if (throw_err && stderr) throw new Error(stderr);

  return stdout;
};

const uuid = () => {
  return String(new Date().getUTCMilliseconds());
};

exports.fs = fs;
exports.path = path;
exports.exec = exec;
exports.uuid = uuid;
exports.git = git('./');
