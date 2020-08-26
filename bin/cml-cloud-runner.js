#!/usr/bin/env node

const print = console.log;
console.log = console.error;

const yargs = require('yargs');
const NodeSSH = require('node-ssh').NodeSSH;
const fss = require('fs');
const fs = fss.promises;
const { exec, sleep } = require('../src/utils');

require.extensions['.tf'] = function (module, filename) {
  module.exports = fss.readFileSync(filename, 'utf8');
};

const TERRAFORM_TPLS = {
  aws: require('./../terraform/aws.tf')
};

const { handle_error } = process.env.GITHUB_ACTIONS
  ? require('../src/github')
  : require('../src/gitlab');

const setup_runner = async opts => {
  const { 
    terraform_state,
    username = 'ubuntu',
    
    repo_token = process.env.repo_token || '09c47960bd8510e9a7bb983ad7269899e2c838f7',
    RUNNER_REPO = 'https://github.com/DavidGOrtega/3_tensorboard/',
    RUNNER_LABELS='cml5',
    RUNNER_IDLE_TIMEOUT=10,
    RUNNER_NAME,
    cml_image='davidgortega/cml:tf'
  } = opts;

  if(!repo_token) throw new Error('repo_token is not available.');

  const { attributes: { public_ip:host } } = terraform_state.resources.find((res) => ['aws_instance'].includes(res.type)).instances[0];
  const { attributes: { private_key_pem:privateKey }} = terraform_state.resources.find((res) => ['tls_private_key'].includes(res.type)).instances[0];

  console.log({ host, username, privateKey });

  const ssh = new NodeSSH()
  await ssh.connect({ host, username, privateKey });

  const setup_docker_cmd = `
    curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && \
    sudo usermod -aG docker \${USER} && \
    sudo setfacl --modify user:\${USER}:rw /var/run/docker.sock`;

  const setup_nvidia_cmd = `
    curl -s -L https://nvidia.GitHub.io/nvidia-docker/gpgkey | sudo apt-key add - && \
    curl -s -L https://nvidia.GitHub.io/nvidia-docker/ubuntu18.04/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list && \
    sudo apt update && sudo apt install -y ubuntu-drivers-common  && \
    sudo ubuntu-drivers autoinstall  && \
    sudo apt install -y nvidia-container-toolkit && \
    sudo systemctl restart docker`;
  
  const start_runner_cmd = `
    docker run --name runner --rm -d \
    -e AWS_SECRET_ACCESS_KEY=${process.env.AWS_SECRET_ACCESS_KEY} \
    -e AWS_ACCESS_KEY_ID=${process.env.AWS_ACCESS_KEY_ID} \
    -v $(pwd)/terraform.tfstate:/terraform.tfstate \
    -v $(pwd)/main.tf:/main.tf \
    -e "repo_token=${repo_token}" \
    -e "RUNNER_REPO=${RUNNER_REPO}" \
    ${RUNNER_LABELS ? `-e "RUNNER_LABELS=${RUNNER_LABELS}"` : ''} \
    ${RUNNER_IDLE_TIMEOUT ? `-e "RUNNER_IDLE_TIMEOUT=${RUNNER_IDLE_TIMEOUT}"` : ''} \
    ${RUNNER_NAME ? `-e "RUNNER_NAME=${RUNNER_NAME}"` : ''} \
    ${cml_image}`;

  //console.log(start_runner_cmd);

  print('Provisioning docker...');
  const setup_docker_out = await ssh.execCommand(setup_docker_cmd);
  print(setup_docker_out);

  //print('Provisioning nvidia drivers and nvidia-gpu...');
  //const setup_nvidia_out = await ssh.execCommand(setup_nvidia_cmd);
  //print(setup_nvidia_out);

  print('Starting runner...');
  //const xx = await ssh.execCommand('docker system prune --all -f');
  //print(xx);
  await ssh.putFile('terraform.tfstate', 'terraform.tfstate');
  await ssh.putFile('main.tf', 'main.tf');
  const start_runner_out = await ssh.execCommand(start_runner_cmd);
  print(start_runner_out);

  await ssh.dispose();
}

const run_terraform = async opts => {
  const { tpl = 'aws' } = opts;

  print('Initializing terraform...');
  await fs.writeFile('main.tf', TERRAFORM_TPLS[tpl]);

  const init_out = await exec('terraform init');
  print(init_out);

  /* const plan_out = await exec('terraform plan');
  print(plan_out); */

  const apply_out = await exec('terraform apply -auto-approve');
  print(apply_out);

  const terraform_state_json = await fs.readFile('terraform.tfstate', 'utf-8');
  const terraform_state = JSON.parse(terraform_state_json);

  return terraform_state;
}

const cleanup_terraform = async (opts) => {
  print('Cleaning up terraform...');
  try { await fs.rmdir('.terraform', { recursive: true }); } catch(err){}
  try { await fs.unlink('terraform.tfstate'); } catch(err){}
  try { await fs.unlink('terraform.tfstate.backup'); } catch(err){}
  try { await fs.unlink('main.tf'); } catch(err){}
  try { await fs.unlink('key.pem'); } catch(err){}
}

const destroy_terraform = async (opts) => {
  print('Performing terraform destroy...');
  console.log(await exec('terraform destroy -auto-approve'));
}

const run = async opts => {
  try {
    const terraform_state = await run_terraform(opts);

    await sleep(10);
    await setup_runner({ terraform_state });
    await sleep(10);

  } catch (err) {
    await destroy_terraform({});
    await cleanup_terraform({});

    throw new Error(`An error ooccured deploying the runner: ${err.message}`);
  }

  await cleanup_terraform();
};

const argv = yargs
  .usage(`Usage: $0 <path> --file <string>`)
  .help('h');
run(argv).catch(e => handle_error(e));
