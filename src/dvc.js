const fs = require('fs').promises;
const { exec } = require('./utils');
const { INPUT_SKIP } = require('./settings');

const GOOGLE_APPLICATION_CREDENTIALS_PATH =
  '.dvc/tmp/GOOGLE_APPLICATION_CREDENTIALS.json';

const setup = async () => {
  try {
    await exec('dvc version');
  } catch (err) {
    console.log('Installing DVC ...');
    try {
      await exec('pip3 uninstall -y enum34');
    } catch (e) {}
    await exec('pip3 install --quiet dvc[all]');
  }
};

const setup_credentials = async credentials => {
  console.log('Setting DVC credentials ...');

  const { GOOGLE_APPLICATION_CREDENTIALS } = credentials;

  if (GOOGLE_APPLICATION_CREDENTIALS) {
    await fs.mkdir('.dvc/tmp', { recursive: true });
    await fs.writeFile(
      GOOGLE_APPLICATION_CREDENTIALS_PATH,
      GOOGLE_APPLICATION_CREDENTIALS
    );
    process.env.GOOGLE_APPLICATION_CREDENTIALS = GOOGLE_APPLICATION_CREDENTIALS_PATH;
  }
};

const setup_remote = async opts => {
  const { dvc_pull } = opts;

  await this.setup_credentials(process.env);

  if (dvc_pull === INPUT_SKIP) {
    console.log(`DVC pull skipped by ${INPUT_SKIP}`);
    return;
  }

  console.log('Pulling from DVC remote ...');
  try {
    await this.pull({ force: true, targets: dvc_pull });
    console.log('Pulling from DVC remote completed');
  } catch (err) {
    const { message } = err;

    // Only throw if not credentials since it may throw if never ran repro before
    // or won't have tracked folders
    // https://github.com/iterative/dvc/issues/3433
    if (message.includes('Unable to locate credentials')) throw err;
    else console.error(`Failed pulling from DVC remote: ${message}`);
  }
};

const pull = async opts => {
  const { force = false, targets = [] } = opts;
  const targets_param = targets.length ? targets.join(' ') : '';
  opts.command = `dvc pull ${force ? '-f ' : ''}${targets_param}`.trim();

  console.log(opts.command);
  const dvc_out = await exec(opts.command);

  return dvc_out;
};

const repro = async opts => {
  const { targets = [] } = opts;
  const targets_param = targets.length ? targets.join(' ') : '';
  opts.command = `dvc repro ${targets_param}`;

  console.log(opts.command);
  const dvc_out = await exec(opts.command);

  return dvc_out;
};

const diff = async opts => {
  const { from = '', to = '', target } = opts;
  const target_param = target ? `--target ${target}` : '';
  opts.command = `dvc diff ${target_param} --show-json ${from} ${to}`;

  console.log(opts.command);
  const json = await exec(opts.command);

  if (json) return JSON.parse(json);
};

const metrics_diff = async opts => {
  const { from = '', to = '', targets = [] } = opts;
  const targets_param = targets.length ? `--targets ${targets.join(' ')}` : '';
  opts.command = `dvc metrics diff ${targets_param} --show-json ${from} ${to}`;

  console.log(opts.command);
  const json = await exec(opts.command);

  if (json) return JSON.parse(json);
};

exports.GOOGLE_APPLICATION_CREDENTIALS_PATH = GOOGLE_APPLICATION_CREDENTIALS_PATH;
exports.setup = setup;
exports.setup_remote = setup_remote;
exports.setup_credentials = setup_credentials;
exports.pull = pull;
exports.repro = repro;
exports.diff = diff;
exports.metrics_diff = metrics_diff;
