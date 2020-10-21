#!/usr/bin/env node

const yargs = require('yargs');
const NodeSSH = require('node-ssh').NodeSSH;
const fss = require('fs');
const fs = fss.promises;
const path = require('path');

const {
  exec,
  sleep,
  ssh_public_from_private_rsa,
  parse_param_newline,
  randid
} = require('../src/utils');

const CML = require('../src/cml');
let cml;
let REPO;
let TOKEN;

const TF_FOLDER = '.cml';
const TF_NO_LOCAL = '.nolocal';

const ssh_connect = async (opts) => {
  const { host, username, private_key: privateKey, max_tries = 5 } = opts;
  const ssh = new NodeSSH();

  console.log('Connecting through SSH');

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

const setup_runners = async (opts) => {
  const {
    terraform_state,
    username = 'ubuntu',
    'repo-token': repo_token = TOKEN,
    repo: runner_repo = REPO,
    labels: runner_labels,
    'idle-timeout': runner_idle_timeout,
    name: runner_name = randid(),
    image = 'dvcorg/cml:latest',
    'rsa-private-key': rsa_private_key,
    attached,
    driver
  } = opts;

  const tf_path = path.join(TF_FOLDER, 'main.tf');
  const tfstate_path = path.join(TF_FOLDER, 'terraform.tfstate');

  if (!repo_token)
    throw new Error(
      'Repository token not set. Your repo_token is not available!'
    );

  if (!runner_repo)
    throw new Error(
      'Repo not set. Your repo must be set to register the runner!'
    );

  for (let i = 0; i < terraform_state.resources.length; i++) {
    const resource = terraform_state.resources[i];
    const instance = resource.instances[0];

    console.log('Instance', instance);

    const {
      attributes: { instance_ip: host, key_private }
    } = instance;

    if (!host)
      throw new Error('Your machine does not have a public IP to be reached!');

    const private_key =
      key_private && key_private.length ? key_private : rsa_private_key;
    const ssh = await ssh_connect({ host, username, private_key });

    console.log('Uploading terraform files...');
    await ssh.putFile(tfstate_path, 'terraform.tfstate');
    await ssh.putFile(`${tf_path}${TF_NO_LOCAL}`, 'main.tf');

    console.log('Starting runner...');
    const { code: nvidia_code } = await ssh.execCommand('nvidia-smi');
    const gpu = !nvidia_code;

    const start_runner_cmd = `
      sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock && \
      docker run --name runner --rm ${attached ? '' : '-d'} ${
      gpu ? '--gpus all' : ''
    } \
      -e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
      -e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
      -v $(pwd)/terraform.tfstate:/terraform.tfstate \
      -v $(pwd)/main.tf:/main.tf \
      -e "repo_token=${repo_token}" \
      -e "RUNNER_REPO=${runner_repo}" \
      -e "RUNNER_DRIVER=${driver}" \
      -e "RUNNER_NAME=${runner_name}" \
      ${runner_labels ? `-e "RUNNER_LABELS=${runner_labels}"` : ''} \
      ${
        runner_idle_timeout
          ? `-e "RUNNER_IDLE_TIMEOUT=${runner_idle_timeout}"`
          : ''
      } \
      ${image}`;

    console.log(start_runner_cmd);
    const start_runner_cmd_out = await ssh.execCommand(start_runner_cmd);
    console.log(start_runner_cmd_out);

    if (start_runner_cmd_out.code)
      throw new Error(
        `Error starting the runner. $${start_runner_cmd_out.stdout}`
      );

    await ssh.dispose();
  }

  await cml.await_runner({ name: runner_name });
};

const run_terraform = async (opts) => {
  console.log('Initializing terraform...');

  const {
    region,
    type: instance_type,
    'hdd-size': instance_hdd_size,
    'tf-file': tf_file,
    'rsa-private-key': rsa_private_key
  } = opts;

  const tf_path = path.join(TF_FOLDER, 'main.tf');
  const tfstate_path = path.join(TF_FOLDER, 'terraform.tfstate');
  const tf_change_path_command = `terraform {
    backend "local" { path = "./${tfstate_path}" }
  }`;

  try {
    await fs.rmdir(TF_FOLDER, { recursive: true });
  } catch (err) {}

  await fs.mkdir(TF_FOLDER);

  if (tf_file) {
    await fs.writeFile(tf_path, await fs.readFile(tf_file));
    await fs.writeFile(tf_path + '2', await fs.readFile(tf_file));
  } else {
    const tpl = `
terraform {
  required_providers {
    iterative = {
      source = "DavidGOrtega/iterative"
      version = "0.4.0"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  ${region ? `region = "${region}"` : ''}
  ${instance_type ? `instance_type = "${instance_type}"` : ''}
  ${instance_hdd_size ? `instance_hdd_size = "${instance_hdd_size}"` : ''}
  ${
    rsa_private_key
      ? `key_public = "${ssh_public_from_private_rsa(rsa_private_key)}"`
      : ''
  }
}
`;
    await fs.writeFile(tf_path, tpl);
    await fs.writeFile(`${tf_path}${TF_NO_LOCAL}`, tpl);
  }

  await fs.appendFile(tf_path, tf_change_path_command);

  console.log(await exec(`terraform init ${TF_FOLDER}`));
  console.log(await exec(`terraform apply -auto-approve ${TF_FOLDER}`));

  const terraform_state_json = await fs.readFile(
    path.join(TF_FOLDER, 'terraform.tfstate'),
    'utf-8'
  );
  const terraform_state = JSON.parse(terraform_state_json);

  return terraform_state;
};

const destroy_terraform = async () => {
  console.log('Performing terraform destroy...');
  console.log(await exec(`terraform destroy -auto-approve ${TF_FOLDER}`));
};

const shutdown = async () => {
  await destroy_terraform();
  process.exit(0);
};

const run = async (opts) => {
  cml = new CML({ ...opts, token: opts.repoToken });
  REPO = cml.env_repo();
  TOKEN = cml.env_token();

  try {
    const terraform_state = await run_terraform(opts);
    await setup_runners({ terraform_state, ...opts, driver: cml.driver });
  } catch (err) {
    await destroy_terraform({});

    throw new Error(`An error occurred deploying the runner: ${err.message}`);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGQUIT', shutdown);

const argv = yargs
  .usage(`Usage: $0`)
  .default('repo-token')
  .describe(
    'repo-token',
    'Repository token. Defaults to workflow env variable repo_token.'
  )
  .default('repo')
  .describe(
    'repo',
    'Repository to register with. Tries to guess from workflow env variables.'
  )
  .default('labels')
  .describe('labels', 'Comma delimited runner labels. Defaults to cml')
  .default('idle-timeout')
  .describe(
    'idle-timeout',
    'Time in seconds for the runner to be waiting for jobs before shutting down. Defaults to 5 min'
  )
  .default('image')
  .describe('image', 'Docker image. Defaults to dvcorg/cml:latest')
  .default('name')
  .describe('name', 'Name displayed in the repo once registered.')
  .default('region')
  .describe(
    'region',
    'Region where the instance is deployed. Defaults to us-east-1.'
  )
  .describe('type', 'Instance type. Defaults to t2.micro.')
  .default('hdd-size')
  .describe('hdd-size', 'HDD size in GB. Defaults to 100. Minimum is 100.')
  .default('tf-file')
  .describe(
    'tf-file',
    'Use a tf file configuration ignoring region, type and hdd_size.'
  )
  .default('rsa-private-key', '')
  .describe(
    'rsa-private-key',
    'Your private RSA SHH key. If not provided will be generated by the tf provider.'
  )
  .boolean('attached')
  .describe('attached', 'Runs the runner in the foreground.')
  .coerce('rsa-private-key', parse_param_newline)
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
run(argv).catch((e) => {
  console.error(e);
  process.exit(1);
});
