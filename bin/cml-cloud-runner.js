#!/usr/bin/env node

const yargs = require('yargs');
const NodeSSH = require('node-ssh').NodeSSH;
const fss = require('fs');
const fs = fss.promises;
const { exec, sleep } = require('../src/utils');

const { handle_error, repo: REPO, token: TOKEN } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const ssh_connect = async (opts) => {
  const { host, username, private_key: privateKey, max_tries = 100 } = opts;
  const ssh = new NodeSSH();

  console.log('Connecting through SSH');

  let ready = false;
  let trials = 0;
  while (!ready) {
    try {
      await ssh.connect({
        host,
        username,
        privateKey,
        readyTimeout: 30 * 1000
      });
      ready = true;
    } catch (err) {
      if (max_tries === trials) throw err;
      trials += 1;
    }
  }

  return ssh;
};

const setup_runner = async (opts) => {
  const {
    terraform_state,
    username = 'ubuntu',

    gpu = false,
    'repo-token': repo_token = TOKEN,
    repo: runner_repo = REPO,
    labels: runner_labels,
    'idle-timeout': runner_idle_timeout,
    name: runner_name,
    image = 'dvcorg/cml:latest'
  } = opts;

  const {
    attributes: { instance_ip: host, key_private: private_key }
  } = terraform_state.resources[0].instances[0];

  if (!repo_token)
    throw new Error(
      'Repository token not set. Your repo_token is not available!'
    );

  if (!runner_repo)
    throw new Error(
      'Repo not set. Your repo must be set to register the runner!'
    );

  if (!host)
    throw new Error('Your machine does not have a public IP to be reached!');

  console.log('These are your machine public ip and private key');
  console.log(host);
  console.log(private_key);

  const start_runner_cmd = `
    sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock && \
    docker run --name runner --rm -d ${gpu ? '--gpus all' : ''} \
    -e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
    -e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
    -v $(pwd)/terraform.tfstate:/terraform.tfstate \
    -v $(pwd)/main.tf:/main.tf \
    -e "repo_token=${repo_token}" \
    -e "RUNNER_REPO=${runner_repo}" \
    ${runner_labels ? `-e "RUNNER_LABELS=${runner_labels}"` : ''} \
    ${
      runner_idle_timeout
        ? `-e "RUNNER_IDLE_TIMEOUT=${runner_idle_timeout}"`
        : ''
    } \
    ${runner_name ? `-e "RUNNER_NAME=${runner_name}"` : ''} \
    ${image}`;

  const ssh = await ssh_connect({ host, username, private_key });

  console.log('Uploading terraform files...');
  await ssh.putFile('terraform.tfstate', 'terraform.tfstate');
  await ssh.putFile('main.tf', 'main.tf');

  console.log('Starting runner...');
  console.log(start_runner_cmd);
  console.log(await ssh.execCommand(start_runner_cmd));

  await ssh.dispose();
};

const runner_join_repo = async () => {
  await sleep(20);
};

const run_terraform = async (opts) => {
  const {
    region,
    type: instance_type,
    'hdd-size': instance_hdd_size,
    'tf-file': tf_file,
    'ssh-key': ssh_key
  } = opts;

  console.log('Initializing terraform...');

  if (tf_file) {
    await fs.writeFile('main.tf', await fs.readFile(tf_file));
  } else {
    const tpl = `
terraform {
  required_providers {
    iterative = {
      versions = ["0.1"]
      source = "github.com/iterative/iterative"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  ${region ? `region = "${region}"` : ''}
  ${instance_type ? `instance_type = "${instance_type}"` : ''}
  ${instance_hdd_size ? `instance_hdd_size = "${instance_hdd_size}"` : ''}
  ${ssh_key ? `key_public = "${ssh_key}"` : ''}
}
`;
    await fs.writeFile('main.tf', tpl);
  }

  console.log(await exec('terraform init'));
  console.log(
    await exec('terraform apply -auto-approve -plugin-dir=/terraform_plugins')
  );

  const terraform_state_json = await fs.readFile('terraform.tfstate', 'utf-8');
  const terraform_state = JSON.parse(terraform_state_json);

  return terraform_state;
};

const cleanup_terraform = async () => {
  console.log('Cleaning up terraform...');

  try {
    await fs.unlink('main.tf');
    await fs.rmdir('.terraform', { recursive: true });
    await fs.unlink('terraform.tfstate');
    await fs.unlink('terraform.tfstate.backup');
    await fs.unlink('crash.log');
  } catch (err) {
    console.error(`Failed clearing up terraform: ${err.message}`);
  }
};

const destroy_terraform = async () => {
  console.log('Performing terraform destroy...');
  console.log(await exec('terraform destroy -auto-approve'));
};

const run = async (opts) => {
  try {
    await cleanup_terraform({});

    const terraform_state = await run_terraform(opts);
    await setup_runner({ terraform_state, ...opts });
    await runner_join_repo();
    await cleanup_terraform();
  } catch (err) {
    await destroy_terraform({});
    await cleanup_terraform({});

    throw new Error(`An error occurred deploying the runner: ${err.message}`);
  }
};

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
  .boolean('gpu')
  .describe('gpu', 'If set uses GPU.')
  .deprecateOption('gpu', 'Will be infered by the instances type')
  .default('tf-file')
  .describe(
    'tf-file',
    'Use a tf file configuration ignoring region, type and hdd_size.'
  )
  .default('ssh-key')
  .describe(
    'ssh-key',
    'Your public SHH key. If not provided a complete SHH key will be generated automatically.'
  )
  .help('h').argv;
run(argv).catch((e) => handle_error(e));
