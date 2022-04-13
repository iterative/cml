const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const { spawn } = require('child_process');
const { homedir } = require('os');
const tempy = require('tempy');

const winston = require('winston');
const { exec, watermarkUri, sleep } = require('../../src/utils');

const closeFd = (fd) => {
  try {
    fd.close();
  } catch (err) {
    winston.error(err.message);
  }
};

exports.tbLink = async (opts = {}) => {
  const { stdout, stderror, title, name, rmWatermark, md, timeout = 60 } = opts;

  let chrono = 0;
  const chronoStep = 2;
  while (chrono < timeout) {
    const data = await fs.readFile(stdout, 'utf8');
    const urls = data.match(/(https?:\/\/[^\s]+)/) || [];

    if (urls.length) {
      let [output] = urls;

      if (!rmWatermark) output = watermarkUri({ uri: output, type: 'tb' });
      if (md) output = `[${title || name}](${output})`;

      return output;
    }

    await sleep(chronoStep);
    chrono = chrono + chronoStep;
  }

  const error = await fs.readFile(stderror, 'utf8');
  throw new Error(`Tensorboard took too long. ${error}`);
};

exports.command = 'tensorboard-dev';
exports.description = 'Get a tensorboard link';

exports.handler = async (opts) => {
  const {
    md,
    file,
    credentials,
    logdir,
    name,
    description,
    title,
    rmWatermark
  } = opts;

  // set credentials
  const path = `${homedir()}/.config/tensorboard/credentials`;
  await fs.mkdir(path, { recursive: true });
  await fs.writeFile(`${path}/uploader-creds.json`, credentials);

  // launch  tensorboard on background
  const help = await exec('tensorboard dev upload -h');
  const extraParamsFound =
    (name || description) && help.indexOf('--description') >= 0;
  const extraParams = extraParamsFound
    ? `--name "${name}" --description "${description}"`
    : '';
  const command = `tensorboard dev upload --logdir ${logdir} ${extraParams}`;

  const stdoutPath = tempy.file({ extension: 'log' });
  const stdoutFd = await fs.open(stdoutPath, 'a');
  const stderrPath = tempy.file({ extension: 'log' });
  const stderrFd = await fs.open(stderrPath, 'a');

  const proc = spawn(command, [], {
    detached: true,
    shell: true,
    stdio: ['ignore', stdoutFd, stderrFd]
  });

  proc.unref();
  proc.on('exit', async (code) => {
    if (code) {
      const error = await fs.readFile(stderrPath, 'utf8');
      winston.error(`Tensorboard failed with error: ${error}`);
    }
    process.exit(code);
  });

  const url = await exports.tbLink({
    stdout: stdoutPath,
    stderror: stderrPath,
    title,
    name,
    rmWatermark,
    md
  });
  if (!file) console.log(url);
  else await fs.appendFile(file, url);

  closeFd(stdoutFd) && closeFd(stderrFd);
  process.exit(0);
};

exports.builder = (yargs) =>
  yargs.env('CML_TENSORBOARD_DEV').options(
    kebabcaseKeys({
      credentials: {
        type: 'string',
        alias: 'c',
        required: true,
        description:
          'TB credentials as json. Usually found at ~/.config/tensorboard/credentials/uploader-creds.json. If not specified will look for the json at the env variable TB_CREDENTIALS.'
      },
      logdir: {
        type: 'string',
        description: 'Directory containing the logs to process.'
      },
      name: {
        type: 'string',
        description: 'Tensorboard experiment title. Max 100 characters.'
      },
      description: {
        type: 'string',
        description:
          'Tensorboard experiment description. Markdown format. Max 600 characters.'
      },
      md: {
        type: 'boolean',
        description: 'Output as markdown [title || name](url).'
      },
      title: {
        type: 'string',
        alias: 't',
        description:
          'Markdown title, if not specified, param name will be used.'
      },
      file: {
        type: 'string',
        alias: 'f',
        description:
          'Append the output to the given file. Create it if does not exist.'
      },
      rmWatermark: {
        type: 'boolean',
        description: 'Avoid CML watermark.'
      }
    })
  );
