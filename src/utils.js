const fetch = require('node-fetch');
const fs = require('fs');
const PATH = require('path');
const FileType = require('file-type');
const isSvg = require('is-svg');
const forge = require('node-forge');
const NodeSSH = require('node-ssh').NodeSSH;

const exec = async (command) => {
  return new Promise(function (resolve, reject) {
    require('child_process').exec(
      command,
      { ...process.env },
      (error, stdout, stderr) => {
        if (error) reject(new Error(`${command}\n\t${stdout}\n\t${stderr}`));

        resolve((stdout || stderr).slice(0, -1));
      }
    );
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

const fetch_upload_data = async (opts) => {
  const { path, buffer } = opts;

  if (path) {
    try {
      await fs.promises.access(path, fs.constants.F_OK | fs.constants.R_OK);
    } catch (err) {
      throw new Error(`Path ${path} does not exist or is not a readable file`);
    }
  }

  const mime = await mime_type(opts);
  const data = path ? fs.createReadStream(path) : buffer;
  const size = path ? (await fs.promises.stat(path)).size : buffer.length;

  return { mime, size, data };
};

const upload = async (opts) => {
  const { path } = opts;
  const endpoint = 'https://asset.cml.dev';

  const { mime, size, data: body } = await fetch_upload_data(opts);
  const filename = path ? PATH.basename(path) : `file.${mime.split('/')[1]}`;

  const headers = {
    'Content-length': size,
    'Content-Type': mime,
    'Content-Disposition': `inline; filename="${filename}"`
  };

  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const uri = await response.text();

  return { uri, mime, size };
};

const randid = () => {
  return (
    Math.random().toString(36).substring(2, 7) +
    Math.random().toString(36).substring(2, 7)
  );
};

const sleep = (secs) => {
  return new Promise((resolve) => {
    setTimeout(resolve, secs * 1000);
  });
};

const is_proc_running = async (opts) => {
  const { name } = opts;

  const cmd = (() => {
    switch (process.platform) {
      case 'win32':
        return `tasklist`;
      case 'darwin':
        return `ps -ax`;
      case 'linux':
        return `ps -A`;
      default:
        return false;
    }
  })();

  return new Promise((resolve, reject) => {
    require('child_process').exec(cmd, (err, stdout) => {
      if (err) reject(err);

      resolve(stdout.toLowerCase().indexOf(name.toLowerCase()) > -1);
    });
  });
};

const ssh_public_from_private_rsa = (private_key) => {
  const forge_private = forge.pki.privateKeyFromPem(private_key);
  const forge_public = forge.pki.setRsaPublicKey(
    forge_private.n,
    forge_private.e
  );
  const ssh_public = forge.ssh.publicKeyToOpenSSH(forge_public);

  return ssh_public;
};

const watermark_uri = (opts = {}) => {
  const { uri, type } = opts;
  const url = new URL(uri);
  url.searchParams.append('cml', type);

  return url.toString();
};

const download = async (opts = {}) => {
  const { url, path } = opts;
  const res = await fetch(url);
  const stream = fs.createWriteStream(path);
  return new Promise((resolve, reject) => {
    stream.on('error', (err) => reject(err));
    res.body.pipe(stream);
    res.body.on('error', reject);
    stream.on('finish', resolve);
  });
};

const ssh_connection = async (opts) => {
  const { host, username, private_key: privateKey, max_tries = 5 } = opts;

  const ssh = new NodeSSH();

  let trials = 0;
  while (true) {
    try {
      await ssh.connect({
        host,
        username,
        privateKey
      });
      break;
    } catch (err) {
      if (max_tries === trials) throw err;
      trials += 1;
      await sleep(10);
    }
  }

  return ssh;
};

exports.exec = exec;
exports.fetch_upload_data = fetch_upload_data;
exports.upload = upload;
exports.randid = randid;
exports.sleep = sleep;
exports.is_proc_running = is_proc_running;
exports.ssh_public_from_private_rsa = ssh_public_from_private_rsa;
exports.watermark_uri = watermark_uri;
exports.download = download;
exports.ssh_connection = ssh_connection;
