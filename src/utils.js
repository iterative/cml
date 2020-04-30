const util = require('util');
const git = require('simple-git/promise');
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');
const uniqid = require('uniqid');

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

const upload_image = async opts => {
  const { path, buffer } = opts;
  const endpoint = 'https://dvc-public.s3.us-east-2.amazonaws.com';
  const filename = `${uniqid()}.png`;
  const key = `cml/img/${filename}`;

  const body = new FormData();
  body.append('key', key);

  let size;
  if (path) {
    const { size: path_size } = await fs.promises.stat(path);
    size = path_size;
  } else size = buffer.length;

  body.append('Content-Type', 'image/png');
  body.append('file', buffer || fs.createReadStream(path), {
    knownLength: size
  });

  const response = await fetch(endpoint, { method: 'POST', body });

  if (response.status !== 204) throw new Error('Image upload failed');

  return `https://img.cml.dev/${filename}`;
};

exports.exec = exec;
exports.upload_image = upload_image;
exports.git = git('./');
