#!/usr/bin/env node

const { resolve, join } = require('path');
const fs = require('fs').promises;
const fse = require('fs-extra');
const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const {
  exec,
  randid,
  ssh_connection,
  ssh_public_from_private_rsa,
  parse_param_newline
} = require('../src/utils');
const tf = require('../src/terraform');
const CML = require('../src/cml');

const {
  DOCKER_MACHINE, // DEPRECATED
  TF_TARGET,

  RUNNER_PATH = './',
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = `cml-${randid()}`,
  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token,

  CML_PATH = '.cml',
  CML_NO_LOCAL = '.nolocal'
} = process.env;

let cml;
let TIMEOUT_TIMER = 0;
const JOBS_RUNNING = [];

const clear_cml = async (opts = {}) => {
  const { cml_path = CML_PATH } = opts;
  console.log('Clearing previous plan...');
  try {
    await fs.rmdir(cml_path, { recursive: true });
    await fs.mkdir(cml_path);
  } catch (err) {}
};

const shutdown = async (opts) => {
  let { error, cloud } = opts;
  const { name, workspace = '' } = opts;

  if (error) console.error(error);

  const unregister_runner = async () => {
    try {
      console.log('Unregistering runner...');
      await cml.unregister_runner({ name });
      console.log('\tSuccess');
    } catch (err) {
      console.error('\tFailed');
      error = err;
    }
  };

  const shutdown_docker_machine = async () => {
    if (DOCKER_MACHINE) {
      console.log('docker-machine destroy...');
      console.log(
        'Docker machine is deprecated and this will be removed!! Check how to deploy using our tf provider.'
      );
      try {
        await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`);
      } catch (err) {
        console.error(`\tFailed shutting down docker machine: ${err.message}`);
        error = err;
      }
    }
  };

  const shutdown_tf = async () => {
    console.log('Cleanup Iterative cloud resources...');
    const tfstate_path = resolve(workspace, 'terraform.tfstate');

    if (!(await fse.pathExists(tfstate_path))) {
      console.log('\tNo Iterative cloud config found. Nothing to do.');
      return;
    }

    try {
      await tf.fix_tfstate_version({ path: tfstate_path });
      await tf.initdestroy({ target: TF_TARGET });
    } catch (err) {
      console.error(`\tFailed Terraform destroy: ${err.message}`);
      error = err;
    }
  };

  if (cloud) {
    await clear_cml();
  } else {
    await unregister_runner();
    await shutdown_docker_machine();
  }

  await shutdown_tf();

  process.exit(error ? 1 : 0);
};

const run_cloud = async (opts) => {
  const run_terraform = async (opts) => {
    console.log('Terraform apply...');

    const {
      cloud,
      cloud_region: region,
      cloud_name: name = `cml_${randid()}`,
      cloud_type: type,
      cloud_gpu: gpu,
      cloud_hdd_size: hdd_size,
      cloud_ssh_private: ssh_private,
      tf_file
    } = opts;

    const tf_path = join(CML_PATH, 'main.tf');
    const tfstate_path = join(CML_PATH, 'terraform.tfstate');

    let tpl;
    if (tf_file) {
      tpl = await fs.writeFile(tf_path, await fs.readFile(tf_file));
    } else {
      const ssh_public = ssh_private
        ? ssh_public_from_private_rsa(ssh_private)
        : null;

      tpl = tf.iterative_tpl({
        cloud,
        region,
        name,
        type,
        gpu,
        hdd_size,
        ssh_public
      });
    }

    await fs.writeFile(tf_path, tpl);
    await fs.writeFile(`${tf_path}${CML_NO_LOCAL}`, tpl);

    const tpl_local = `terraform {
      backend "local" { path = "./${tfstate_path}" }
    }`;
    await fs.appendFile(tf_path, tpl_local);

    await tf.initapply({ dir: CML_PATH });

    const tfstate = await tf.load_tfstate(tfstate_path);

    return tfstate;
  };

  const setup_runner = async (opts) => {
    const { token, repo, driver } = cml;
    const {
      instance,
      labels,
      idle_timeout,

      cloud_ssh_user: ssh_user,
      cloud_ssh_private: ssh_private,
      attached,

      tf_target,
      runner_path = '/home/runner'
    } = opts;

    const {
      attributes: {
        instance_name,
        instance_ip: host,
        key_private = ssh_private
      }
    } = instance;

    console.log('Provisioning cloud instance...');
    console.log(JSON.stringify(instance));

    const ssh = await ssh_connection({
      host,
      username: ssh_user,
      private_key: key_private
    });

    console.log('Uploading terraform files...');
    const tfstate_path = join(CML_PATH, 'terraform.tfstate');
    await ssh.putFile(tfstate_path, 'terraform.tfstate');

    const tf_path = join(CML_PATH, 'main.tf');
    await ssh.putFile(`${tf_path}${CML_NO_LOCAL}`, 'main.tf');
    console.log('\tSuccess');

    console.log('Deploying runner...');
    const { code: nvidia_code } = await ssh.execCommand('nvidia-smi');
    const gpu = !nvidia_code;
    console.log(`\tGPU ${gpu}`);

    console.log(`\tDocker image`);
    const start_runner_cmd = `
      sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock && \
      docker run --name runner --rm ${attached ? '' : '-d'} ${
      gpu ? '--gpus all' : ''
    } \
      -e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
      -e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
      -v $(pwd)/terraform.tfstate:${join(runner_path, 'terraform.tfstate')} \
      -v $(pwd)/main.tf:${join(runner_path, 'main.tf')} \
      -e "RUNNER_PATH=${runner_path}" \
      -e "RUNNER_DRIVER=${driver}" \
      -e "RUNNER_NAME=${instance_name}" \
      -e "RUNNER_REPO=${repo}" \
      -e "repo_token=${token}" \
      ${tf_target ? `-e "TF_TARGET=iterative_machine.${tf_target}"` : ''} \
      ${labels ? `-e "RUNNER_LABELS=${labels}"` : ''} \
      ${idle_timeout ? `-e "RUNNER_IDLE_TIMEOUT=${idle_timeout}"` : ''} \
      davidgortega/cml:runner`;

    const { code: docker_code, stdout, stderr } = await ssh.execCommand(
      start_runner_cmd
    );

    await ssh.dispose();

    if (docker_code)
      throw new Error(`Error deploying the runner: ${stdout || stderr}`);

    if (!attached) await cml.await_runner({ name: instance_name });

    console.log('\tSuccess');
  };

  console.log('Deploying cloud runner plan...');
  await clear_cml();

  const tfstate = await run_terraform(opts);
  const { resources } = tfstate;
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    const instance = resource.instances[0];

    await setup_runner({
      ...opts,
      tf_target: resource.name,
      instance
    });
  }
  console.log('\tSuccesfully deployed!');
};

const run_local = async (opts) => {
  console.log(`Launching ${cml.driver} runner`);

  const { workspace: path, name, labels, 'idle-timeout': idle_timeout } = opts;

  const proc = await cml.start_runner({
    path,
    name,
    labels,
    idle_timeout
  });

  const data_handler = (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      JOBS_RUNNING.push(1);
      TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      JOBS_RUNNING.pop();
    }
  };
  proc.stderr.on('data', data_handler);
  proc.stdout.on('data', data_handler);
  proc.on('error', () => {
    shutdown(opts);
  });

  if (parseInt(idle_timeout) !== 0) {
    const watcher = setInterval(() => {
      TIMEOUT_TIMER >= idle_timeout && shutdown(opts) && clearInterval(watcher);

      if (!JOBS_RUNNING.length) TIMEOUT_TIMER++;
    }, 1000);
  }
};

const run = async (opts) => {
  process.on('SIGTERM', () => shutdown(opts));
  process.on('SIGINT', () => shutdown(opts));
  process.on('SIGQUIT', () => shutdown(opts));

  const { driver, repo, token, cloud } = opts;

  cml = new CML({ driver, repo, token });
  await cml.repo_token_check();

  if (cloud) await run_cloud(opts);
  else await run_local(opts);
};

const opts = decamelize(
  yargs
    .usage(`Usage: $0`)
    .default('workspace', RUNNER_PATH)
    .describe(
      'workspace',
      'Runner workspace location. Defaults to current directory.'
    )
    .coerce('workspace', (path) => resolve(__dirname, path))
    .default('labels', RUNNER_LABELS)
    .describe('labels', 'Comma delimited runner labels')
    .default('idle-timeout', RUNNER_IDLE_TIMEOUT)
    .describe(
      'idle-timeout',
      'Time in seconds for the runner to be waiting for jobs before shutting down. 0 waits forever.'
    )
    .default('name', RUNNER_NAME)
    .describe('name', 'Name displayed in the repo once registered')
    .default('driver', RUNNER_DRIVER)
    .choices('driver', ['github', 'gitlab'])
    .describe('driver', 'If not specify it infers it from the ENV.')
    .default('repo', RUNNER_REPO)
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token', repo_token)
    .describe(
      'token',
      'Personal access token to be used. If not specified in extracted from ENV repo_token or GITLAB_TOKEN.'
    )

    .default('cloud')
    .describe('cloud', 'Cloud to deploy the runner')
    .choices('driver', ['aws', 'azure'])
    .default('cloud-region')
    .describe(
      'cloud-region',
      'Region where the instance is deployed. Defaults to us-west. Also accepts native cloud regions.'
    )
    .choices('driver', ['us-east', 'us-west', 'eu-west', 'eu-north'])
    .default('cloud-type')
    .describe('cloud-type', 'Instance type')
    .choices('cloud-type', ['m', 'l', 'xl'])
    .default('cloud-gpu-type')
    .describe('cloud-gpu-type', 'Instance type')
    .choices('cloud-gpu-type', ['nogpu', 'k80', 'tesla'])
    .default('cloud-hdd-size')
    .describe('cloud-hdd-size', 'HDD size in GB.')
    .default('cloud-image', 'iterative-cml')
    .describe(
      'cloud-image',
      'Image used in the cloud instance. Defaults to our CML image (Ubuntu 18.04)'
    )
    .default('cloud-ssh-user', 'root')
    .describe('cloud-ssh-user', 'Your username to connect with ssh.')
    .default('cloud-ssh-private', '')
    .describe(
      'cloud-ssh-private',
      'Your private RSA SHH key. If not provided will be generated by the Terraform-provider-Iterative.'
    )
    .coerce('cloud-ssh-private', parse_param_newline)
    .boolean('attached')
    .describe(
      'attached',
      'Runs the cloud runner deployment in the foreground. Useful for debugging.'
    )

    .default('cloud-tf-target', TF_TARGET)
    .describe(
      'cloud-tf-target',
      'Specifies the target resource to be disposed in the tf plan.'
    )

    .help('h').argv
);

run(opts).catch((error) => {
  shutdown({ ...opts, error });
});
