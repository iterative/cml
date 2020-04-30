const util = require('util');
const git = require('simple-git/promise');
const imgur = require('imgur');
imgur.setClientId('9ae2688f25fae09');

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

  let response;
  if (buffer) response = await imgur.uploadBase64(buffer.toString('base64'));
  else response = await imgur.uploadFile(path);

  if (!response.data.link) throw new Error('Image upload failed');

  return response.data.link;
};

exports.exec = exec;
exports.upload_image = upload_image;
exports.git = git('./');
