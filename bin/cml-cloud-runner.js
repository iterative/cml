#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const NodeSSH = require('node-ssh').NodeSSH;
const fss = require('fs');
const fs = fss.promises;
const { exec, sleep } = require('../src/utils');

const { handle_error } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const ssh_connect = async (opts) => {
  const { host, username, privateKey } = opts;
  const ssh = new NodeSSH();

  console.log('Connecting through SSH');

  let ready = false;
  const maxtrials = 100;
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
      if (maxtrials === trials) throw err;
      trials += 1;
    }
  }

  return ssh;
};

const setup_runner = async (opts) => {
  const {
    terraform_state,
    username = 'ubuntu',

    gpus,
    repo_token,
    runner_repo,
    runner_labels = 'cml',
    runner_idle_timeout,
    runner_name,
    cml_image = 'dvcorg/cml:latest'
  } = opts;

  const {
    attributes: { instance_ip: host, private_key: privateKey }
  } = terraform_state.resources[0].instances[0];

  if (!host)
    throw new Error('Your machine does not have a public IP to be reached!');

  console.log('These are your machine public ip and private key');
  console.log(host);
  console.log(privateKey);

  const setup_docker_cmd = `
    curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
    sudo usermod -aG docker \${USER}`;

  const setup_nvidia_cmd = `
    curl -s -L https://nvidia.GitHub.io/nvidia-docker/gpgkey | sudo apt-key add - && \
    curl -s -L https://nvidia.GitHub.io/nvidia-docker/ubuntu18.04/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list && \
    sudo apt update && sudo apt install -y ubuntu-drivers-common  && \
    sudo ubuntu-drivers autoinstall  && \
    sudo apt install -y nvidia-container-toolkit && \
    sudo shutdown -r now`;

  const start_runner_cmd = `
    sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock && \
    docker run --name runner --rm -d ${gpus ? `--gpus ${gpus}` : ''} \
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
    ${cml_image}`;

  let ssh = await ssh_connect({ host, username, privateKey });

  print('Provisioning docker...');
  const setup_docker_out = await ssh.execCommand(setup_docker_cmd);
  print(setup_docker_out);

  print('Provisioning nvidia drivers and nvidia-gpu...');
  const setup_nvidia_out = await ssh.execCommand(setup_nvidia_cmd);
  print(setup_nvidia_out);

  ssh = await ssh_connect({ host, username, privateKey });

  print('Starting runner...');
  console.log(await exec('ls terraform.tfstate'));
  console.log(await exec('ls main.tf'));
  await ssh.putFile('terraform.tfstate', 'terraform.tfstate');
  await ssh.putFile('main.tf', 'main.tf');
  const start_runner_out = await ssh.execCommand(start_runner_cmd);
  print(start_runner_out);

  await ssh.dispose();
};

const runner_join_repo = async () => {
  await sleep(20);
};

const run_terraform = async (opts) => {
  const { region, instance_ami, instance_type, tf_file } = opts;

  print('Initializing terraform...');

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
  ${instance_type ? `instance_ami = "${instance_type}"` : ''}
  ${instance_ami ? `instance_ami = "${instance_ami}"` : ''}
}
`;
    await fs.writeFile('main.tf', tpl);
  }

  const init_out = await exec('terraform init -plugin-dir=/terraform_plugins');
  print(init_out);

  const apply_out = await exec('terraform apply -auto-approve');
  print(apply_out);

  const terraform_state_json = await fs.readFile('terraform.tfstate', 'utf-8');
  const terraform_state = JSON.parse(terraform_state_json);

  return terraform_state;
};

const cleanup_terraform = async (opts) => {
  print('Cleaning up terraform...');
  try {
    await fs.rmdir('.terraform', { recursive: true });
  } catch (err) {}
  try {
    await fs.unlink('terraform.tfstate');
  } catch (err) {}
  try {
    await fs.unlink('terraform.tfstate.backup');
  } catch (err) {}
  try {
    await fs.unlink('main.tf');
  } catch (err) {}
  try {
    await fs.unlink('key.pem');
  } catch (err) {}
};

const destroy_terraform = async (opts) => {
  print('Performing terraform destroy...');
  console.log(await exec('terraform destroy -auto-approve'));
};

const run = async (opts) => {
  try {
    const terraform_state = await run_terraform(opts);

    await setup_runner({ terraform_state, ...opts });
    await runner_join_repo();
  } catch (err) {
    await destroy_terraform({});
    await cleanup_terraform({});

    throw new Error(`An error occurred deploying the runner: ${err.message}`);
  }

  await cleanup_terraform();
};

const argv = yargs
  .usage(`Usage: $0`)
  .required('repo_token')
  .required('runner_repo')
  .required('runner_labels')
  .default('runner_name')
  .default('runner_idle_timeout')
  .default('cml_image')
  .default('gpus')
  .describe(
    'gpus',
    'leave empty if no gpu. possible values: all, 1, 2... more information read docker gpus param'
  )
  .default('region')
  .default('instance_ami')
  .default('instance_type')
  .default('tf_file')
  .help('h').argv;
run(argv).catch((e) => handle_error(e));
