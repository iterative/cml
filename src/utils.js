const util = require('util');
const fetch = require('node-fetch');
const fs = require('fs');
const PATH = require('path');
const FileType = require('file-type');

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  return new Promise(function(resolve, reject) {
    const { debug } = opts || {};

    execp(command, (error, stdout, stderr) => {
      if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

      if (error) reject(error);

      resolve((stdout || stderr).slice(0, -1));
    });
  });
};

const upload = async opts => {
  const { path, buffer } = opts;
  const endpoint = 'https://asset.cml.dev';

  let body;
  let size;
  let mime;
  let filename;

  if (path) {
    body = fs.createReadStream(path);
    ({ size } = await fs.promises.stat(path));
    ({ mime } = await FileType.fromFile(path));
    filename = PATH.basename(path);
  } else {
    body = buffer;
    size = buffer.length;
    ({ mime } = await FileType.fromBuffer(buffer));
    filename = `file.${mime.split('/')[1]}`;
  }

  const headers = {
    'Content-length': size,
    'Content-Type': mime,
    'Content-Disposition': `inline; filename="${filename}"`
  };
  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const uri = await response.text();

  return { mime, size, uri };
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
exports.upload = upload;
exports.randid = randid;
