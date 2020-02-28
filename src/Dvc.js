const { exec, fs } = require('./utils');

const setup = async () => {
  try {
    await exec('dvc');
  } catch (err) {
    console.log('Installing Dvc ...');
    await exec('pip3 uninstall -y enum34', { throw_err: false });
    await exec('pip3 install --quiet dvc[all]');
  }
};

const init_remote = async opts => {
  const { dvc_pull = true } = opts;

  if (!dvc_pull) {
    console.log('Skipping dvc_pull by user');
    return;
  }

  console.log('Initiating Dvc remote ...');

  const dvc_remote_list = (
    await exec('dvc remote list', { throw_err: false })
  ).toLowerCase();
  const has_dvc_remote = dvc_remote_list.length > 0;

  if (!has_dvc_remote) throw new Error('Experiment does not have Dvc remote!');

  // s3
  if (dvc_remote_list.includes('s3://')) {
    const { AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY } = process.env;
    if (!AWS_ACCESS_KEY_ID || !AWS_SECRET_ACCESS_KEY) {
      throw new Error(`S3 dvc remote found but no credentials found`);
    }
  }

  // azure
  if (dvc_remote_list.includes('azure://')) {
    const {
      AZURE_STORAGE_CONNECTION_STRING,
      AZURE_STORAGE_CONTAINER_NAME
    } = process.env;
    if (!AZURE_STORAGE_CONNECTION_STRING || !AZURE_STORAGE_CONTAINER_NAME) {
      throw new Error(`Azure dvc remote found but no credentials found`);
    }
  }

  // Aliyn
  if (dvc_remote_list.includes('oss://')) {
    const {
      OSS_BUCKET,
      OSS_ACCESS_KEY_ID,
      OSS_ACCESS_KEY_SECRET,
      OSS_ENDPOINT
    } = process.env;
    if (
      !OSS_BUCKET ||
      !OSS_ACCESS_KEY_ID ||
      !OSS_ACCESS_KEY_SECRET ||
      !OSS_ENDPOINT
    ) {
      throw new Error(`Aliyin dvc remote found but no credentials found`);
    }
  }

  // gs
  if (dvc_remote_list.includes('gs://')) {
    const { GOOGLE_APPLICATION_CREDENTIALS } = process.env;
    if (GOOGLE_APPLICATION_CREDENTIALS) {
      const path = '.dvc/tmp/GOOGLE_APPLICATION_CREDENTIALS.json';
      await fs.writeFile(path, GOOGLE_APPLICATION_CREDENTIALS);
      process.env.GOOGLE_APPLICATION_CREDENTIALS = path;
    } else {
      throw new Error(
        `Google storage dvc remote found but no credentials found`
      );
    }
  }

  // gdrive
  if (dvc_remote_list.includes('gdrive://')) {
    const { GDRIVE_USER_CREDENTIALS } = process.env;
    if (GDRIVE_USER_CREDENTIALS) {
      const path = '.dvc/tmp/gdrive-user-credentials.json';
      await fs.writeFile(path, GDRIVE_USER_CREDENTIALS);
    } else {
      throw new Error(`Google drive dvc remote found but no credentials found`);
    }
  }

  // ssh
  if (dvc_remote_list.includes('ssh://')) {
    const { DVC_REMOTE_SSH_KEY } = process.env;
    if (DVC_REMOTE_SSH_KEY) {
      const path = '~/.ssh/dvc_remote.pub';
      await fs.writeFile(path, DVC_REMOTE_SSH_KEY);
      await exec(`echo ${path} >> ~/.ssh/known_hosts`);
    } else {
      throw new Error(`SSH dvc remote found but no credentials found`);
    }
  }

  // HDFS
  if (dvc_remote_list.includes('hdfs://')) {
    // TODO: implement
    throw new Error(`HDFS secrets not yet implemented`);
  }

  if (has_dvc_remote) {
    console.log('Pulling from Dvc remote ...');
    try {
      await exec('dvc pull -f', { throw_err: false });
      console.log('Pulling from Dvc remote completed');
    } catch (err) {
      console.error(err);
      throw new Error('Failed pulling from Dvc remote');
    }
  }
};

const repro = async opts => {
  const { targets = [] } = opts;
  const targets_param = targets.length ? targets.join(' ') : '';
  const dvc_out = await exec(`dvc repro ${targets_param}`, {
    throw_err: false
  });
  return dvc_out;
};

const diff = async opts => {
  const { from = '', to = '', target } = opts;
  const target_param = target ? `--target ${target}` : '';
  const json = await exec(
    `dvc diff ${target_param} --show-json ${from} ${to}`,
    { throw_err: false }
  );

  console.log(`dvc diff ${target_param} --show-json ${from} ${to}`);
  console.log(json);

  if (json) return JSON.parse(json);
};

const metrics_diff = async opts => {
  const { from = '', to = '', targets = [] } = opts;
  const targets_param = targets.length ? `--targets ${targets.join(' ')}` : '';
  const json = await exec(
    `dvc metrics diff ${targets_param} --show-json ${from} ${to}`,
    { throw_err: false }
  );

  console.log(`dvc metrics diff ${targets_param} --show-json ${from} ${to}`);
  console.log(json);

  if (json) return JSON.parse(json);
};

exports.setup = setup;
exports.init_remote = init_remote;
exports.repro = repro;
exports.diff = diff;
exports.metrics_diff = metrics_diff;
