const util = require('util');
const git = require('simple-git/promise');
const fetch = require('node-fetch');
const fs = require('fs');
const FileType = require('file-type');

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

const upload = async opts => {
  const { path, buffer } = opts;
  const endpoint = 'https://asset.cml.dev';

  let body;
  let size;
  let mime;

  if (path) {
    body = fs.createReadStream(path);
    ({ size } = await fs.promises.stat(path));
    ({ mime } = await FileType.fromFile(path));
  } else {
    body = buffer;
    size = buffer.length;
    ({ mime } = await FileType.fromBuffer(buffer));
  }

  const headers = { 'Content-length': size, 'Content-Type': mime };
  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const uri = await response.text();

  return { mime, size, uri };
};

exports.exec = exec;
exports.upload = upload;
exports.git = git('./');
