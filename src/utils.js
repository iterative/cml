const util = require('util');
const git = require('simple-git/promise');
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const crypto = require('crypto');
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
  const endpoint = 'https://dvc-public.s3.us-east-2.amazonaws.com';
  const hasher = crypto.createHash('sha1');

  let file;
  let size;
  let mime;

  if (path) {
    file = fs.createReadStream(path);
    ({ size } = await fs.promises.stat(path));
    ({ mime } = await FileType.fromFile(path));

    hasher.update(await fs.promises.readFile(path));
  } else {
    file = buffer;
    size = buffer.length;
    ({ mime } = await FileType.fromBuffer(buffer));

    hasher.update(buffer.toString());
  }

  const filename = hasher.digest('hex');
  const key = `cml/img/${filename}`;
  const body = new FormData();
  body.append('key', key);
  body.append('Content-Type', mime);
  body.append('file', file, {
    knownLength: size
  });

  const response = await fetch(endpoint, { method: 'POST', body });

  if (response.status !== 204) throw new Error('Upload failed');

  return { mime: mime, size: size, uri: `${endpoint}/${key}` };
};

exports.exec = exec;
exports.upload = upload;
exports.git = git('./');
