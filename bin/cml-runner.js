#!/usr/bin/env node

const { join } = require('path');
const { homedir } = require('os');

const fs = require('fs').promises;
const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const { exec, randid, sleep } = require('../src/utils');
const tf = require('../src/terraform');
const CML = require('../src/cml');

const NAME = `cml-${randid()}`;
const WORKDIR_BASE = `${homedir()}/.cml`;
const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH = `${WORKDIR_BASE}/${NAME}`,
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_DESTROY_DELAY = 30,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = NAME,
  RUNNER_SINGLE = false,
  RUNNER_REUSE = false,
  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token
} = process.env;

let cml;
let RUNNER_LAUNCHED = false;
let RUNNER_TIMEOUT_TIMER = 0;
let RUNNER_SHUTTING_DOWN = false;
const RUNNER_JOBS_RUNNING = [];

const shutdown = async (opts) => {
  if (RUNNER_SHUTTING_DOWN) return;

  RUNNER_SHUTTING_DOWN = true;

  let { error, cloud } = opts;
  const { name, workdir = '' } = opts;
  const tf_path = workdir;

  console.log(
    JSON.stringify({ level: error ? 'error' : 'info', status: 'terminated' })
  );
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

    console.log(
      `\tDestroy scheduled: ${RUNNER_DESTROY_DELAY} seconds remaining.`
    );
    await sleep(RUNNER_DESTROY_DELAY);

    DOCKER_MACHINE && (await shutdown_docker_machine());
    await shutdown_tf();
  }

  process.exit(error ? 1 : 0);
};

const run_cloud = async (opts) => {
  const { cloud_ssh_private_visible } = opts;

  const run_terraform = async (opts) => {
    console.log('Terraform apply...');

    const { token, repo, driver } = cml;
    const {
      labels,
      idle_timeout,
      name,
      cloud,
      cloud_region: region,
      cloud_type: type,
      cloud_gpu: gpu,
      cloud_hdd_size: hdd_size,
      cloud_ssh_private: ssh_private,
      cloud_spot: spot,
      cloud_spot_price: spot_price,
      cloud_startup_script: startup_script,
      tf_file,
      workdir
    } = opts;

    const tf_path = workdir;
    const tf_main_path = join(tf_path, 'main.tf');

    let tpl;
    if (tf_file) {
      tpl = await fs.writeFile(tf_main_path, await fs.readFile(tf_file));
    } else {
      tpl = tf.iterative_cml_runner_tpl({
        repo,
        token,
        driver,
        labels,
        idle_timeout,
        name,
        cloud,
        region,
        type,
        gpu,
        hdd_size,
        ssh_private,
        spot,
        spot_price,
        startup_script
      });
    }

    await fs.writeFile(tf_main_path, tpl);
    await tf.init({ dir: tf_path });
    await tf.apply({ dir: tf_path });

    const tfstate_path = join(tf_path, 'terraform.tfstate');
    const tfstate = await tf.load_tfstate({ path: tfstate_path });

    return tfstate;
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

        if (!cloud_ssh_private_visible) {
          instance.attributes.ssh_private = '[MASKED]';
        }

        console.log(JSON.stringify(instance));

        const {
          attributes: { name }
        } = instance;
        await cml.await_runner({ name });
      }
    }
  }
};

const run_local = async (opts) => {
  console.log(`Launching ${cml.driver} runner`);
  const { workdir, name, labels, single, idle_timeout } = opts;

  const proc = await cml.start_runner({
    workdir,
    name,
    labels,
    single,
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
  proc.on('uncaughtException', () => shutdown(opts));
  proc.on('SIGINT', () => shutdown(opts));
  proc.on('SIGTERM', () => shutdown(opts));
  proc.on('SIGQUIT', () => shutdown(opts));

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
  const {
    driver,
    repo,
    token,
    cloud,
    workdir,
    labels,
    name,
    reuse,
    tf_resource
  } = opts;

  cml = new CML({ driver, repo, token });

  await tf.check_min_version();

  // prepare tf
  if (tf_resource) {
    const tf_path = workdir;
    const { tf_resource } = opts;

    await fs.mkdir(tf_path, { recursive: true });
    const tf_main_path = join(tf_path, 'main.tf');
    const tpl = tf.iterative_provider_tpl();
    await fs.writeFile(tf_main_path, tpl);
    await tf.init({ dir: tf_path });
    await tf.apply({ dir: tf_path });
    const path = join(tf_path, 'terraform.tfstate');
    const tfstate = await tf.load_tfstate({ path });
    tfstate.resources = [
      JSON.parse(Buffer.from(tf_resource, 'base64').toString('utf-8'))
    ];
    await tf.save_tfstate({ tfstate, path });
  }

  // if (name !== NAME) {
  await cml.repo_token_check();

  if (await cml.runner_by_name({ name })) {
    if (!reuse)
      throw new Error(
        `Runner name ${name} is already in use. Please change the name or terminate the other runner.`
      );
    console.log(`Reusing existing runner named ${name}...`);
    process.exit(0);
  }

  if (reuse && (await cml.runners_by_labels({ labels })).length > 0) {
    console.log(`Reusing existing runners with the ${labels} labels...`);
    process.exit(0);
  }

  try {
    console.log(`Preparing workdir ${workdir}...`);
    await fs.mkdir(workdir, { recursive: true });
  } catch (err) {}

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

    .boolean('single')
    .default('single', RUNNER_SINGLE)
    .describe('single', 'If specified, exit after running a single job.')
    .boolean('reuse')
    .default('reuse', RUNNER_REUSE)
    .describe(
      'reuse',
      "If specified, don't spawn a new runner if there is a registed runner with the given labels."
    )

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
    .choices('cloud', ['aws', 'azure', 'kubernetes'])
    .default('cloud-region', 'us-west')
    .describe(
      'cloud-region',
      'Region where the instance is deployed. Choices:[us-east, us-west, eu-west, eu-north]. Also accepts native cloud regions.'
    )
    .default('cloud-type')
    .describe(
      'cloud-type',
      'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro'
    )
    .default('cloud-gpu')
    .describe('cloud-gpu', 'GPU type.')
    .choices('cloud-gpu', ['nogpu', 'k80', 'tesla'])
    .coerce('cloud-gpu-type', (val) => (val === 'nogpu' ? null : val))
    .default('cloud-hdd-size')
    .describe('cloud-hdd-size', 'HDD size in GB.')
    .default('cloud-ssh-private', '')
    .describe(
      'cloud-ssh-private',
      'Your private RSA SSH key. If not provided will be generated by the Terraform-provider-Iterative.'
    )
    .boolean('cloud-ssh-private-visible')
    .describe(
      'cloud-ssh-private-visible',
      'Your SSH key will be visible in the output with the rest of the instance properties.'
    )
    .boolean('cloud-spot')
    .describe('cloud-spot', 'Request a spot instance')
    .default('cloud-spot-price', '-1')
    .describe(
      'cloud-spot-price',
      'Spot max price. If not specified it takes current spot bidding pricing.'
    )
    .default('cloud-startup-script', '')
    .describe(
      'cloud-startup-script',
      'Script to be run in your machine at startup time. Must be Base64 encoded.'
    )
    .default('tf_resource')
    .hide('tf_resource')
    .help('h').argv
);

run(opts).catch((error) => {
  shutdown({ ...opts, error });
});
