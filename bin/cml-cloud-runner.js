#!/usr/bin/env node

const yargs = require('yargs');
const fss = require('fs');
const fs = fss.promises;
const { join } = require('path');

const {
  ssh_connection,
  ssh_public_from_private_rsa,
  parse_param_newline,
  randid
} = require('../src/utils');

const tf = require('../src/terraform');

const CML = require('../src/cml');
let cml;

const TF_FOLDER = '.cml';
const TF_NO_LOCAL = '.nolocal';

const setup_runners = async (opts) => {
  const { token, repo, driver } = cml;
  const {
    tfstate,

    labels: runner_labels,
    workspace: runner_path = '/home/runner',
    'idle-timeout': runner_idle_timeout,

    'ssh-user': ssh_user,
    'ssh-private': ssh_private,

    image = 'dvcorg/cml:latest',
    attached
  } = opts;

  const tf_path = join(TF_FOLDER, 'main.tf');
  const tfstate_path = join(TF_FOLDER, 'terraform.tfstate');

  const { resources } = tfstate;
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    const instance = resource.instances[0];

    console.log('Preparing cloud instance...');
    console.log(JSON.encode(instance));

    const {
      attributes: {
        instance_name,
        instance_ip: host,
        key_private = ssh_private
      }
    } = instance;

    const ssh = await ssh_connection({
      host,
      username: ssh_user,
      private_key: key_private
    });

    console.log('Uploading terraform files...');
    await ssh.putFile(tfstate_path, 'terraform.tfstate');
    await ssh.putFile(`${tf_path}${TF_NO_LOCAL}`, 'main.tf');

    console.log('Deploying runner...');
    const { code: nvidia_code } = await ssh.execCommand('nvidia-smi');
    const gpu = !nvidia_code;

    const start_runner_cmd = `
      sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock && \
      docker run --name runner --rm ${attached ? '' : '-d'} ${
      gpu ? '--gpus all' : ''
    } \
      -e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
      -e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
      -v $(pwd)/terraform.tfstate:${join(runner_path, 'terraform.tfstate')} \
      -v $(pwd)/main.tf:${join(runner_path, 'main.tf')} \
      -e "repo_token=${token}" \
      -e "RUNNER_TF_NAME=iterative_machine.${resource.name}" \
      -e "RUNNER_REPO=${repo}" \
      -e "RUNNER_DRIVER=${driver}" \
      -e "RUNNER_NAME=${instance_name}" \
      -e "RUNNER_PATH=${runner_path}" \
      ${runner_labels ? `-e "RUNNER_LABELS=${runner_labels}"` : ''} \
      ${
        runner_idle_timeout
          ? `-e "RUNNER_IDLE_TIMEOUT=${runner_idle_timeout}"`
          : ''
      } \
      ${image}`;

    const { code: docker_code, stdout } = await ssh.execCommand(
      start_runner_cmd
    );

    if (docker_code) throw new Error(`Error deploying the runner: ${stdout}`);

    await ssh.dispose();

    if (!attached) await cml.await_runner({ name: instance_name });

    console.log('\tSuccess');
  }
};

const run_terraform = async (opts) => {
  const {
    cloud,
    region,
    name: instance_name = `cml_${randid()}`,
    type: instance_type,
    'hdd-size': instance_hdd_size,
    'tf-file': tf_file,
    'ssh-private': ssh_private
  } = opts;

  const tf_path = join(TF_FOLDER, 'main.tf');
  const tfstate_path = join(TF_FOLDER, 'terraform.tfstate');

  console.log('Clearing previous .cml...');
  try {
    await fs.rmdir(TF_FOLDER, { recursive: true });
    await fs.mkdir(TF_FOLDER);
  } catch (err) {}

  console.log('Terraform apply...');
  let tpl;
  if (tf_file) {
    tpl = await fs.writeFile(tf_path, await fs.readFile(tf_file));
  } else {
    const key_public = ssh_private
      ? ssh_public_from_private_rsa(ssh_private)
      : null;
    tpl = tf.iterative_tpl({
      cloud,
      region,
      instance_name,
      instance_type,
      instance_hdd_size,
      tf_file,
      ssh_private,
      key_public
    });
  }

  await fs.writeFile(tf_path, tpl);
  await fs.writeFile(`${tf_path}${TF_NO_LOCAL}`, tpl);

  const tpl_local = `terraform {
    backend "local" { path = "./${tfstate_path}" }
  }`;
  await fs.appendFile(tf_path, tpl_local);

  await tf.initapply({ dir: TF_FOLDER });

  const tfstate = await tf.load_tfstate(tfstate_path);

  return tfstate;
};

const shutdown = async (opts) => {
  let { error } = opts;
  if (error)
    console.error(`An error occurred deploying the runner: ${error.message}`);

  const destroy_terraform = async () => {
    try {
      console.log(await tf.initdestroy({ dir: TF_FOLDER }));
    } catch (err) {
      console.error(`\tFailed destroying terraform: ${err.message}`);
      error = err;
    }
  };

  await destroy_terraform();
  process.exit(error ? 1 : 0);
};

const run = async (opts) => {
  process.on('SIGTERM', () => shutdown(opts));
  process.on('SIGINT', () => shutdown(opts));
  process.on('SIGQUIT', () => shutdown(opts));

  cml = new CML({ ...opts });
  await cml.repo_token_check();

  const tfstate = await run_terraform(opts);
  await setup_runners({ tfstate, ...opts });
};

const argv = yargs
  .usage(`Usage: $0`)
  .default('image')
  .describe('image', 'Docker image. Defaults to dvcorg/cml:latest')

  .default('cloud')
  .describe('cloud', 'Cloud to deploy the runner')
  .default('labels')
  .describe('labels', 'Comma delimited runner labels. Defaults to cml')
  .default('idle-timeout')
  .describe(
    'idle-timeout',
    'Time in seconds for the runner to be waiting for jobs before shutting down. Defaults to 5 min'
  )
  .default('name')
  .describe('name', 'Name displayed in the repo once registered.')
  .default('region')
  .describe(
    'region',
    'Region where the instance is deployed. Defaults to us-west.'
  )
  .describe('type', 'Instance type. Defaults to m.')
  .default('hdd-size')
  .describe('hdd-size', 'HDD size in GB. Defaults to 10.')
  .default('tf-file')
  .describe(
    'tf-file',
    'Use a tf file configuration ignoring region, type and hdd_size.'
  )
  .default('ssh-private', '')
  .describe(
    'ssh-private',
    'Your private RSA SHH key. If not provided will be generated by the tf provider.'
  )
  .coerce('ssh-private', parse_param_newline)

  .boolean('attached')
  .describe('attached', 'Runs the runner in the foreground.')

  .default('repo')
  .describe(
    'repo',
    'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
  )
  .default('token')
  .describe(
    'token',
    'Personal access token to be used. If not specified in extracted from ENV repo_token or GITLAB_TOKEN.'
  )
  .default('driver')
  .choices('driver', ['github', 'gitlab'])
  .describe('driver', 'If not specify it infers it from the ENV.')
  .help('h').argv;

run(argv).catch((error) => {
  shutdown({ error });
});
