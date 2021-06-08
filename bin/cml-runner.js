#!/usr/bin/env node

const { join } = require('path');
const { homedir } = require('os');

const fs = require('fs').promises;
const yargs = require('yargs');

const { exec, randid, sleep } = require('../src/utils');
const tf = require('../src/terraform');
const CML = require('../src/cml').default;

const NAME = `cml-${randid()}`;
const WORKDIR_BASE = `${homedir()}/.cml`;
const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH = `${WORKDIR_BASE}/${NAME}`,
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_DESTROY_DELAY = 10,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = NAME,
  RUNNER_SINGLE = false,
  RUNNER_REUSE = false,
  RUNNER_RETRY = false,
  RUNNER_DRIVER,
  RUNNER_REPO,
  REPO_TOKEN
} = process.env;

let cml;
let RUNNER;
let RUNNER_TIMEOUT_TIMER = 0;
let RUNNER_SHUTTING_DOWN = false;
let RUNNER_JOBS_RUNNING = [];

const shutdown = async (opts) => {
  if (RUNNER_SHUTTING_DOWN) return;

  RUNNER_SHUTTING_DOWN = true;

  let { error, cloud } = opts;
  const { name, workdir = '', tfResource, retry } = opts;
  const tfPath = workdir;

  console.log(
    JSON.stringify({ level: error ? 'error' : 'info', status: 'terminated' })
  );
  if (error) console.error(error);

  const unregisterRunner = async () => {
    try {
      console.log(`Unregistering runner ${name}...`);
      await cml.unregisterRunner({ name });
      console.log('\tSuccess');
    } catch (err) {
      console.error('\tFailed');
      error = err;
    }
  };

  const shutdownDockerMachine = async () => {
    console.log('docker-machine destroy...');
    console.log(
      'Docker machine is deprecated and will be removed!! Check how to deploy using our tf provider.'
    );
    try {
      await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`);
    } catch (err) {
      console.error(`\tFailed shutting down docker machine: ${err.message}`);
      error = err;
    }
  };

  const destroyTerraform = async () => {
    try {
      console.log(await tf.destroy({ dir: tfPath }));
    } catch (err) {
      console.error(`\tFailed destroying terraform: ${err.message}`);
      error = err;
    }
  };

  if (cloud) {
    await destroyTerraform();
  } else {
    await sleep(RUNNER_DESTROY_DELAY);

    try {
      if (retry && RUNNER_JOBS_RUNNING.length) {
        await Promise.all(
          RUNNER_JOBS_RUNNING.map(
            async (job) => await cml.pipelineRestart({ jobId: job.id })
          )
        );
      }
    } catch (err) {
      console.log(err);
    }

    RUNNER && (await unregisterRunner());

    if (!tfResource) {
      console.log(`\tNo TF resource found`);
    } else {
      await destroyTerraform();
    }

    DOCKER_MACHINE && (await shutdownDockerMachine());
  }

  RUNNER && RUNNER.kill('SIGINT');
  process.exit(error ? 1 : 0);
};

const runCloud = async (opts) => {
  const { cloudSshPrivateVisible } = opts;

  const runTerraform = async (opts) => {
    console.log('Terraform apply...');

    const { token, repo, driver } = cml;
    const {
      labels,
      idleTimeout,
      name,
      single,
      cloud,
      cloudRegion: region,
      cloudType: type,
      cloudGpu: gpu,
      cloudHddSize: hddSize,
      cloudSshPrivate: sshPrivate,
      cloudSpot: spot,
      cloudSpotPrice: spotPrice,
      cloudStartupScript: startupScript,
      tfFile,
      workdir
    } = opts;

    const tfPath = workdir;
    const tfMainPath = join(tfPath, 'main.tf');

    let tpl;
    if (tfFile) {
      tpl = await fs.writeFile(tfMainPath, await fs.readFile(tfFile));
    } else {
      if (gpu === 'tesla')
        console.log(
          'GPU model "tesla" has been deprecated; please use "v100" instead.'
        );
      tpl = tf.iterativeCmlRunnerTpl({
        repo,
        token,
        driver,
        labels,
        idleTimeout,
        name,
        single,
        cloud,
        region,
        type,
        gpu: gpu === 'tesla' ? 'v100' : gpu,
        hddSize,
        sshPrivate,
        spot,
        spotPrice,
        startupScript
      });
    }

    await fs.writeFile(tfMainPath, tpl);
    await tf.init({ dir: tfPath });
    await tf.apply({ dir: tfPath });

    const tfStatePath = join(tfPath, 'terraform.tfstate');
    const tfstate = await tf.loadTfState({ path: tfStatePath });

    return tfstate;
  };

  console.log('Deploying cloud runner plan...');
  const tfstate = await runTerraform(opts);
  const { resources } = tfstate;
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];

    if (resource.type.startsWith('iterative_')) {
      const { instances } = resource;

      for (let j = 0; j < instances.length; j++) {
        const instance = instances[j];

        if (!cloudSshPrivateVisible) {
          instance.attributes.sshPrivate = '[MASKED]';
        }

        instance.attributes.token = '[MASKED]';
        console.log(JSON.stringify(instance));
      }
    }
  }
};

const runLocal = async (opts) => {
  console.log(`Launching ${cml.driver} runner`);
  const { workdir, name, labels, single, idleTimeout, retry } = opts;

  const proc = await cml.startRunner({
    workdir,
    name,
    labels,
    single,
    idleTimeout
  });

  const dataHandler = async (data) => {
    const log = await cml.parseRunnerLog({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      RUNNER_JOBS_RUNNING.push({ id: log.job, date: log.date });
      RUNNER_TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      const { job } = log;
      if (!RUNNER_SHUTTING_DOWN) {
        const jobs = job
          ? [job]
          : (await cml.pipelineJobs({ ids: RUNNER_JOBS_RUNNING }))
              .filter((job) => job.status === 'completed')
              .map((job) => job.id);

        RUNNER_JOBS_RUNNING = RUNNER_JOBS_RUNNING.filter(
          (job) => !jobs.includes(job.id)
        );
      }
    }
  };

  proc.stderr.on('data', dataHandler);
  proc.stdout.on('data', dataHandler);
  proc.on('uncaughtException', () => shutdown(opts));
  proc.on('SIGINT', () => shutdown(opts));
  proc.on('SIGTERM', () => shutdown(opts));
  proc.on('SIGQUIT', () => shutdown(opts));

  if (parseInt(idleTimeout) !== 0) {
    const watcher = setInterval(() => {
      RUNNER_TIMEOUT_TIMER >= idleTimeout &&
        shutdown(opts) &&
        clearInterval(watcher);

      if (!RUNNER_JOBS_RUNNING.length) RUNNER_TIMEOUT_TIMER++;
    }, 1000);
  }

  if (retry && cml.driver === 'github') {
    const watcher = setInterval(() => {
      RUNNER_JOBS_RUNNING.forEach((job) => {
        const seventyTwoMinusFive = 72 * 60 * 60 * 1000 - 5 * 60 * 1000;
        if (
          new Date().getTime() - new Date(job.date).getTime() >
          seventyTwoMinusFive
        )
          shutdown(opts) && clearInterval(watcher);
      });
    }, 60 * 1000);
  }

  RUNNER = proc;
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
    tfResource
  } = opts;

  cml = new CML({ driver, repo, token });

  await tf.checkMinVersion();

  // prepare tf
  if (tfResource) {
    const tfPath = workdir;

    await fs.mkdir(tfPath, { recursive: true });
    const tfMainPath = join(tfPath, 'main.tf');
    const tpl = tf.iterativeProviderTpl();
    await fs.writeFile(tfMainPath, tpl);
    await tf.init({ dir: tfPath });
    await tf.apply({ dir: tfPath });
    const path = join(tfPath, 'terraform.tfstate');
    const tfstate = await tf.loadTfState({ path });
    tfstate.resources = [
      JSON.parse(Buffer.from(tfResource, 'base64').toString('utf-8'))
    ];
    await tf.saveTfState({ tfstate, path });
  }

  // if (name !== NAME) {
  await cml.repoTokenCheck();

  if (await cml.runnerByName({ name })) {
    if (!reuse)
      throw new Error(
        `Runner name ${name} is already in use. Please change the name or terminate the other runner.`
      );
    console.log(`Reusing existing runner named ${name}...`);
    process.exit(0);
  }

  if (reuse && (await cml.runnersByLabels({ labels })).length > 0) {
    console.log(`Reusing existing runners with the ${labels} labels...`);
    process.exit(0);
  }

  try {
    console.log(`Preparing workdir ${workdir}...`);
    await fs.mkdir(workdir, { recursive: true });
  } catch (err) {}

  if (cloud) await runCloud(opts);
  else await runLocal(opts);
};

const opts = yargs
  .strict()
  .usage(`Usage: $0`)
  .default('labels', RUNNER_LABELS)
  .describe(
    'labels',
    'One or more user-defined labels for this runner (delimited with commas)'
  )
  .default('idle-timeout', RUNNER_IDLE_TIMEOUT)
  .describe(
    'idle-timeout',
    'Time in seconds for the runner to be waiting for jobs before shutting down. Setting it to 0 disables automatic shutdown'
  )
  .default('name', RUNNER_NAME)
  .describe('name', 'Name displayed in the repository once registered')

  .boolean('retry')
  .default('retry', RUNNER_RETRY)
  .describe(
    'retry',
    'Automatically retries a run which jobs did not finish due to runner disposal or reached 72 hours in Github'
  )
  .boolean('single')
  .default('single', RUNNER_SINGLE)
  .describe('single', 'Exit after running a single job')
  .boolean('reuse')
  .default('reuse', RUNNER_REUSE)
  .describe(
    'reuse',
    "Don't launch a new runner if an existing one has the same name or overlapping labels"
  )

  .default('driver', RUNNER_DRIVER)
  .describe(
    'driver',
    'Platform where the repository is hosted. If not specified, it will be inferred from the environment'
  )
  .choices('driver', ['github', 'gitlab'])
  .default('repo', RUNNER_REPO)
  .describe(
    'repo',
    'Repository to be used for registering the runner. If not specified, it will be inferred from the environment'
  )
  .default('token', REPO_TOKEN)
  .describe(
    'token',
    'Personal access token to register a self-hosted runner on the repository. If not specified, it will be inferred from the environment'
  )
  .default('cloud')
  .describe('cloud', 'Cloud to deploy the runner')
  .choices('cloud', ['aws', 'azure', 'kubernetes'])
  .default('cloud-region', 'us-west')
  .describe(
    'cloud-region',
    'Region where the instance is deployed. Choices: [us-east, us-west, eu-west, eu-north]. Also accepts native cloud regions'
  )
  .default('cloud-type')
  .describe(
    'cloud-type',
    'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro'
  )
  .default('cloud-gpu')
  .describe('cloud-gpu', 'GPU type.')
  .choices('cloud-gpu', ['nogpu', 'k80', 'v100', 'tesla'])
  .coerce('cloud-gpu-type', (val) => (val === 'nogpu' ? null : val))
  .default('cloud-hdd-size')
  .describe('cloud-hdd-size', 'HDD size in GB')
  .default('cloud-ssh-private', '')
  .describe(
    'cloud-ssh-private',
    'Custom private RSA SSH key. If not provided an automatically generated throwaway key will be used'
  )
  .boolean('cloud-ssh-private-visible')
  .describe(
    'cloud-ssh-private-visible',
    'Show the private SSH key in the output with the rest of the instance properties (not recommended)'
  )
  .boolean('cloud-spot')
  .describe('cloud-spot', 'Request a spot instance')
  .default('cloud-spot-price', '-1')
  .describe(
    'cloud-spot-price',
    'Maximum spot instance bidding price in USD. Defaults to the current spot bidding price'
  )
  .default('cloud-startup-script', '')
  .describe(
    'cloud-startup-script',
    'Run the provided Base64-encoded Linux shell script during the instance initialization'
  )
  .default('tf-resource')
  .hide('tf-resource')
  .alias('tf-resource', 'tf_resource')
  .help('h').argv;

run(opts).catch((error) => {
  shutdown({ ...opts, error });
});
