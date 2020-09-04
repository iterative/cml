const util = require('util');
const fetch = require('node-fetch');
const fs = require('fs');
const PATH = require('path');
const FileType = require('file-type');
const isSvg = require('is-svg');

const execp = util.promisify(require('child_process').exec);
const exec = async (command, opts) => {
  return new Promise(function (resolve, reject) {
    const { debug } = opts || {};

    execp(command, (error, stdout, stderr) => {
      if (debug) console.log(`\nCommand: ${command}\n\t${stdout}\n\t${stderr}`);

      if (error) reject(error);

      resolve((stdout || stderr).slice(0, -1));
    });
  });
};

const is_svg = async (opts) => {
  const { path, buffer } = opts;

  if (path && PATH.extname(path).toLowerCase() === '.svg') return true;

  const svg_candidate = path
    ? await fs.promises.readFile(path)
    : buffer.toString('utf-8');

  if (isSvg(svg_candidate)) return true;

  return false;
};

const mime_type = async (opts) => {
  const { path, buffer } = opts;

  try {
    if (await is_svg(opts)) return 'image/svg+xml';

    let mime;
    if (path) ({ mime } = await FileType.fromFile(path));
    else ({ mime } = await FileType.fromBuffer(buffer));

    return mime;
  } catch (err) {
    throw new Error(
      `Failed guessing mime type of ${path ? `file ${path}` : `buffer`}`
    );
  }
};

const upload = async (opts) => {
  const { path, buffer } = opts;
  const endpoint = 'https://asset.cml.dev';
  const mime = await mime_type(opts);

  let body;
  let size;
  let filename;

  if (path) {
    body = fs.createReadStream(path);
    ({ size } = await fs.promises.stat(path));
    filename = PATH.basename(path);
  } else {
    body = buffer;
    size = buffer.length;
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
    Math.random().toString(36).substring(2, 7) +
    Math.random().toString(36).substring(2, 7)
  );
};

exports.exec = exec;
exports.upload = upload;
exports.randid = randid;
