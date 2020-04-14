const util = require('util');
const git = require('simple-git/promise');

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  return new Promise(function(resolve, reject) {
    const { debug } = opts || {};

    execp(command, (error, stdout, stderr) => {
      if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

      if (error) reject(error);

      resolve((stdout || stderr).trim());
    });
  });
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

const getInputArray = (key, default_value) => {
  if (process.env[key] === 'None') return process.env[key];

  return process.env[key]
    ? process.env[key].split(/[ ,]+/)
    : default_value || [];
};

exports.exec = exec;
exports.randid = randid;
exports.getInputArray = getInputArray;
exports.git = git('./');
