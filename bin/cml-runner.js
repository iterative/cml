#!/usr/bin/env node

const { join } = require('path');
const fs = require('fs').promises;
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

const NAME = `cml-${randid()}`;
const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH = `/~/${NAME}`,
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = NAME,
  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token,

  CML_PATH = '.cml',

  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
} = process.env;

let cml;
let RUNNER_LAUNCHED = false;
let RUNNER_TIMEOUT_TIMER = 0;
const RUNNER_JOBS_RUNNING = [];

const shutdown = async (opts) => {
  let { error, cloud } = opts;
  const { name, workdir = '' } = opts;
  const tf_path = join(workdir, CML_PATH) 

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
  };

  const shutdown_tf = async () => {
    const { tf_resource } = opts;

    if (!tf_resource) {
      console.log(`\tNo TF resource found`);
      return;
    }
    
    try {
      await fs.mkdir(tf_path, { recursive: true });
      const tf_main_path = join(tf_path, 'main.tf');
      const tpl = tf.iterative_provider_tpl();
      await fs.writeFile(tf_main_path, tpl);
      await tf.init({ dir: tf_path });
      await tf.apply({ dir: tf_path });
      const path = join(tf_path, 'terraform.tfstate');
      const tfstate = await tf.load_tfstate({ path });
      tfstate.resources = [ JSON.parse(tf_resource) ];
      await tf.save_tfstate({ tfstate, path });
      await tf.destroy({ dir: tf_path });
    } catch (err) {
      console.error(`\tFailed Terraform destroy: ${err.message}`);
      error = err;
    }
  };

  const destroy_terraform = async () => {
    try {
      console.log(await tf.destroy({ dir: tf_path }));
    } catch (err) {
      console.error(`\tFailed destroying terraform: ${err.message}`);
      error = err;
    }
  };

  if (cloud) {
    await destroy_terraform();
  } else {
    RUNNER_LAUNCHED && (await unregister_runner());
    DOCKER_MACHINE && (await shutdown_docker_machine());
    await shutdown_tf();
  }

  process.exit(error ? 1 : 0);
};

const run_cloud = async (opts) => {
  const { workdir } = opts;

  const run_terraform = async (opts) => {
    await tf.check_min_version();

    console.log('Terraform apply...');

    const {
      cloud,
      name,
      cloud_region: region,
      cloud_type: type,
      cloud_gpu: gpu,
      cloud_hdd_size: hdd_size,
      cloud_ssh_private: ssh_private,
      cloud_ssh_username: ssh_username,
      cloud_image: image,
      tf_file,
      workdir
    } = opts;

    const tf_path = join(workdir, CML_PATH);
    const tf_main_path = join(tf_path, 'main.tf');

    let tpl;
    if (tf_file) {
      tpl = await fs.writeFile(tf_main_path, await fs.readFile(tf_file));
    } else {
      const ssh_public = ssh_private
        ? ssh_public_from_private_rsa(ssh_private)
        : null;

      tpl = tf.iterative_machine_tpl({
        cloud,
        region,
        name,
        type,
        gpu,
        hdd_size,
        ssh_public,
        ssh_username,
        image,
      });
    }

    await fs.writeFile(tf_main_path, tpl);
    await tf.init({ dir: tf_path });
    await tf.apply({ dir: tf_path });

    const tfstate_path = join(tf_path, 'terraform.tfstate');
    const tfstate = await tf.load_tfstate({ path: tfstate_path });

    return tfstate;
  };

  const setup_runner = async (opts) => {
    const { token, repo, driver } = cml;
    const {
      labels,
      idle_timeout,
      cloud_ssh_username: username,
      cloud_ssh_private: ssh_private,
      attached,

      resource,
      workdir
    } = opts;

    const {
      attributes: {
        instance_name,
        instance_ip: host,
        key_private = ssh_private
      }
    } = resource.instances[0];

    console.log('Provisioning resource...');
    console.log(JSON.stringify(resource));

    const ssh = await ssh_connection({
      host,
      username,
      private_key: key_private
    });

    console.log('Deploying runner...');

    const cmd = `
sudo sh -c "echo \"group ALL=(ubuntu) NOPASSWD: ALL\" >> /etc/sudoers && \"
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && \
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && \
DEBIAN_FRONTEND=noninteractive && \
npm install -g git+https://github.com/iterative/cml.git#cml-runner && \
(${attached ? '' : 'nohup'} cml-runner \
--tf_resource='${JSON.stringify(resource)}' \
--name ${instance_name} \
--workdir ${workdir} \
--labels ${labels} \
--idle-timeout ${idle_timeout} \
--driver ${driver} \
--repo ${repo} \
--token ${token} ${attached ? '' : '< /dev/null > std.out 2> std.err &'}) && sleep 10
`;

    const { 
      code: cmd_code, 
      stdout: cmd_stdout, 
      stderr: cmd_stderr} = await ssh.execCommand(cmd);
    
    if (cmd_code) {
      await ssh.dispose();
      throw new Error(`Error launching the runner: ${cmd_stdout} ${cmd_stderr}`);
    }
      
    if (!attached) {
      await ssh.dispose();
      await cml.await_runner({ name: instance_name });
    }

    console.log(`\tSuccess: ${cmd_stdout}`);
  };

  console.log('Deploying cloud runner plan...');
  const tfstate = await run_terraform(opts);
  const { resources } = tfstate;
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];

    if (resource.type.startsWith('iterative_')) {

      const { instances } = resource;

      for (let j = 0; j < instances.length; j++) {
        const instance = instances[j];

        await setup_runner({
          ...opts,
          resource: { ...resource, instances: [instance] }
        });
      }
    }
  }
};

const run_local = async (opts) => {
  console.log(`Launching ${cml.driver} runner`);
  const { workdir, name, labels, idle_timeout } = opts;

  const proc = await cml.start_runner({
    workdir,
    name,
    labels,
    idle_timeout
  });

  const data_handler = (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      RUNNER_JOBS_RUNNING.push(1);
      RUNNER_TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      RUNNER_JOBS_RUNNING.pop();
    }
  };
  proc.stderr.on('data', data_handler);
  proc.stdout.on('data', data_handler);
  proc.on('error', () => {
    shutdown(opts);
  });

  if (parseInt(idle_timeout) !== 0) {
    const watcher = setInterval(() => {
      RUNNER_TIMEOUT_TIMER >= idle_timeout &&
        shutdown(opts) &&
        clearInterval(watcher);

      if (!RUNNER_JOBS_RUNNING.length) RUNNER_TIMEOUT_TIMER++;
    }, 1000);
  }

  RUNNER_LAUNCHED = true;
};

const run = async (opts) => {
  process.on('SIGTERM', () => shutdown(opts));
  process.on('SIGINT', () => shutdown(opts));
  process.on('SIGQUIT', () => shutdown(opts));

  opts.workdir = RUNNER_PATH;
  const { driver, repo, token, cloud, workdir } = opts;

  console.log(workdir);
  await fs.mkdir(opts.workdir, { recursive: true });
  //await exec(`sudo mkdir -p ${workdir} && sudo chmod 777 -R ${workdir}`);
  try {
    await fs.mkdir(join(workdir, CML_PATH), { recursive: true });
  } catch (err) {}
  
  cml = new CML({ driver, repo, token });

  await cml.repo_token_check();

  if (cloud) await run_cloud(opts);
  else await run_local(opts);
};

const opts = decamelize(
  yargs
    .usage(`Usage: $0`)
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
    .describe('driver', 'If not specify it infers it from the ENV.')
    .choices('driver', ['github', 'gitlab'])
    .default('repo', RUNNER_REPO)
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token', repo_token)
    .describe(
      'token',
      'Personal access token to be used. If not specified in extracted from ENV.'
    )

    .default('cloud')
    .describe('cloud', 'Cloud to deploy the runner')
    .choices('cloud', ['aws', 'azure'])
    .default('cloud-region', 'us-west')
    .describe(
      'cloud-region',
      'Region where the instance is deployed. Also accepts native cloud regions.'
    )
    //.choices('cloud-region', ['us-east', 'us-west', 'eu-west', 'eu-north'])
    .default('cloud-type')
    .describe(
      'cloud-type',
      'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro'
    )
    .default('cloud-gpu-type')
    .describe('cloud-gpu-type', 'GPU type.')
    .choices('cloud-gpu-type', ['nogpu', 'k80', 'tesla'])
    .coerce('cloud-gpu-type', (val) => (val === 'nogpu' ? null : val))
    .default('cloud-hdd-size')
    .describe('cloud-hdd-size', 'HDD size in GB.')
    .default('cloud-image', 'iterative-cml')
    .describe(
      'cloud-image',
      'Image used in the cloud instance. Defaults to our iterative-cml (Ubuntu 18.04)'
    )
    .default('cloud-ssh-username', 'ubuntu')
    .describe(
      'cloud-ssh-username',
      'Your ssh username. Change only if the specified image is not iterative-cml.'
    )
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
    .default('tf_resource')
    .hide('tf_resource')

    .help('h').argv
);

run(opts).catch((error) => {
  shutdown({ ...opts, error });
});
