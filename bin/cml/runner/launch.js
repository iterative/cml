const { join } = require('path');
const { homedir } = require('os');
const fs = require('fs').promises;
const net = require('net');
const kebabcaseKeys = require('kebabcase-keys');
const timestring = require('timestring');
const { logger } = require('../../../src/logger');

const { exec, randid, sleep } = require('../../../src/utils');
const tf = require('../../../src/terraform');

let cml;
let RUNNER;
let RUNNER_SHUTTING_DOWN = false;
let RUNNER_TIMER = 0;
const RUNNER_JOBS_RUNNING = [];
const GH_5_MIN_TIMEOUT = (35 * 24 * 60 - 5) * 60 * 1000;

const { RUNNER_NAME } = process.env;

const shutdown = async (opts) => {
  if (RUNNER_SHUTTING_DOWN) return;
  RUNNER_SHUTTING_DOWN = true;

  const { error, cloud } = opts;
  const { name, tfResource, noRetry, reason, destroyDelay, watcher } = opts;

  const unregisterRunner = async () => {
    if (!RUNNER) return true;

    try {
      logger.info(`Unregistering runner ${name}...`);
      await cml.unregisterRunner({ name });
    } catch (err) {
      if (err.message.includes('is still running a job')) {
        logger.warn(`\tCancelling shutdown: ${err.message}`);
        return false;
      }

      logger.error(`\tFailed: ${err.message}`);
    }

    RUNNER.kill('SIGINT');
    logger.info('\tSuccess');
    return true;
  };

  const retryWorkflows = async () => {
    try {
      if (!noRetry && RUNNER_JOBS_RUNNING.length > 0) {
        logger.info(`Still pending jobs, retrying workflow...`);

        await Promise.all(
          RUNNER_JOBS_RUNNING.map(
            async (job) =>
              await cml.pipelineRerun({ id: job.pipeline, jobId: job.id })
          )
        );
      }
    } catch (err) {
      logger.error(err);
    }
  };

  const destroyLeo = async () => {
    if (!tfResource) return;

    logger.info(`Waiting ${destroyDelay} seconds to destroy`);
    await sleep(destroyDelay);

    const { cloud, id, region } = JSON.parse(
      Buffer.from(tfResource, 'base64').toString('utf-8')
    ).instances[0].attributes;

    try {
      return await exec(
        'leo',
        'destroy-runner',
        '--cloud',
        cloud,
        '--region',
        region,
        id
      );
    } catch (err) {
      logger.error(`\tFailed destroying with LEO: ${err.message}`);
    }
  };

  if (!cloud) {
    try {
      if (!(await unregisterRunner())) {
        RUNNER_SHUTTING_DOWN = false;
        RUNNER_TIMER = 0;
        return;
      }
      clearInterval(watcher);
      await retryWorkflows();
    } catch (err) {
      logger.error(`Error connecting the SCM: ${err.message}`);
    }
  }

  await destroyLeo();

  if (error) throw error;

  logger.info('runner status', { reason, status: 'terminated' });
  process.exit(0);
};

const runCloud = async (opts) => {
  const runTerraform = async (opts) => {
    logger.info('Terraform apply...');

    const { token, repo, driver } = cml;
    const {
      tpiVersion,
      labels,
      idleTimeout,
      name,
      cmlVersion,
      single,
      dockerVolumes,
      cloud,
      cloudRegion: region,
      cloudType: type,
      cloudPermissionSet: permissionSet,
      cloudMetadata: metadata,
      cloudGpu: gpu,
      cloudHddSize: hddSize,
      cloudSshPrivate: sshPrivate,
      cloudSpot: spot,
      cloudSpotPrice: spotPrice,
      cloudStartupScript: startupScript,
      cloudAwsSecurityGroup: awsSecurityGroup,
      cloudAwsSubnet: awsSubnet,
      cloudKubernetesNodeSelector: kubernetesNodeSelector,
      cloudImage: image,
      workdir
    } = opts;

    await tf.checkMinVersion();

    if (gpu === 'tesla')
      logger.warn(
        'GPU model "tesla" has been deprecated; please use "v100" instead.'
      );

    const tfPath = workdir;
    const tfMainPath = join(tfPath, 'main.tf.json');

    const tpl = tf.iterativeCmlRunnerTpl({
      tpiVersion,
      repo,
      token,
      driver,
      labels,
      cmlVersion,
      idleTimeout,
      name,
      single,
      cloud,
      region,
      type,
      permissionSet,
      metadata,
      gpu: gpu === 'tesla' ? 'v100' : gpu,
      hddSize,
      sshPrivate,
      spot,
      spotPrice,
      startupScript,
      awsSecurityGroup,
      awsSubnet,
      kubernetesNodeSelector,
      image,
      dockerVolumes
    });

    await fs.writeFile(tfMainPath, JSON.stringify(tpl));

    await tf.init({ dir: tfPath });
    await tf.apply({ dir: tfPath });

    const tfStatePath = join(tfPath, 'terraform.tfstate');
    const tfstate = await tf.loadTfState({ path: tfStatePath });

    return tfstate;
  };

  logger.info('Deploying cloud runner plan...');
  const tfstate = await runTerraform(opts);
  const { resources } = tfstate;
  for (const resource of resources) {
    if (resource.type.startsWith('iterative_')) {
      for (const { attributes } of resource.instances) {
        const nonSensitiveValues = {
          awsSecurityGroup: attributes.aws_security_group,
          awsSubnetId: attributes.aws_subnet_id,
          cloud: attributes.cloud,
          driver: attributes.driver,
          id: attributes.id,
          idleTimeout: attributes.idle_timeout,
          image: attributes.image,
          instanceGpu: attributes.instance_gpu,
          instanceHddSize: attributes.instance_hdd_size,
          instanceIp: attributes.instance_ip,
          instanceLaunchTime: attributes.instance_launch_time,
          instanceType: attributes.instance_type,
          instancePermissionSet: attributes.instance_permission_set,
          labels: attributes.labels,
          cmlVersion: attributes.cml_version,
          metadata: attributes.metadata,
          name: attributes.name,
          region: attributes.region,
          repo: attributes.repo,
          single: attributes.single,
          spot: attributes.spot,
          spotPrice: attributes.spot_price,
          timeouts: attributes.timeouts,
          kubernetesNodeSelector: attributes.kubernetes_node_selector
        };
        logger.info(JSON.stringify(nonSensitiveValues));
      }
    }
  }
};

const runLocal = async (opts) => {
  logger.info(`Launching ${cml.driver} runner`);
  const {
    workdir,
    name,
    labels,
    single,
    idleTimeout,
    noRetry,
    cloudSpot,
    dockerVolumes,
    tfResource,
    tpiVersion
  } = opts;

  if (tfResource) {
    await tf.checkMinVersion();

    const tfPath = workdir;
    await fs.mkdir(tfPath, { recursive: true });
    const tfMainPath = join(tfPath, 'main.tf.json');
    const tpl = tf.iterativeProviderTpl({ tpiVersion });
    await fs.writeFile(tfMainPath, JSON.stringify(tpl));

    await tf.init({ dir: tfPath });
    await tf.apply({ dir: tfPath });

    const path = join(tfPath, 'terraform.tfstate');
    const tfstate = await tf.loadTfState({ path });
    tfstate.resources = [
      JSON.parse(Buffer.from(tfResource, 'base64').toString('utf-8'))
    ];
    await tf.saveTfState({ tfstate, path });
  }

  if (process.platform === 'linux') {
    const acpiSock = net.connect('/var/run/acpid.socket');
    acpiSock.on('connect', () => {
      logger.info('Connected to acpid service.');
    });
    acpiSock.on('error', (err) => {
      logger.warn(
        `Error connecting to ACPI socket: ${err.message}. The acpid.service helps with instance termination detection.`
      );
    });
    acpiSock.on('data', (buf) => {
      const data = buf.toString().toLowerCase();
      if (data.includes('power') && data.includes('button')) {
        shutdown({ ...opts, reason: 'ACPI shutdown' });
      }
    });
  }

  const dataHandler =
    ({ cloudSpot }) =>
    async (data) => {
      logger.debug(data.toString());
      const logs = await cml.parseRunnerLog({ data, name, cloudSpot });
      for (const log of logs) {
        logger.info('runner status', log);

        if (log.status === 'job_started') {
          const { job: id, pipeline, date } = log;
          RUNNER_JOBS_RUNNING.push({ id, pipeline, date });
        }

        if (log.status === 'job_ended') {
          // Runners can only take a job at a time, so the whole concept of using
          // an array as a stack/counter (formerly RUNNER_JOBS_RUNNING.pop() on
          // the line below) is a footgun. It should be just a boolean variable
          // to hold the busy/idle status. To avoid too much refactoring, we just
          // empty the array, so empty means idle and populated means busy.
          RUNNER_JOBS_RUNNING.length = 0;

          if (single) await shutdown({ ...opts, reason: 'single job' });
        }
      }
    };

  const proc = await cml.startRunner({
    workdir,
    name,
    labels,
    single,
    idleTimeout,
    dockerVolumes
  });

  proc.stderr.on('data', dataHandler({ cloudSpot }));
  proc.stdout.on('data', dataHandler({ cloudSpot }));
  proc.on('disconnect', () =>
    shutdown({ ...opts, error: new Error('runner proccess lost') })
  );
  proc.on('close', (exit) => {
    const reason = `runner closed with exit code ${exit}`;
    if (exit === 0) shutdown({ ...opts, reason });
    else shutdown({ ...opts, error: new Error(reason) });
  });

  RUNNER = proc;
  if (idleTimeout > 0) {
    const watcher = setInterval(async () => {
      const idle = RUNNER_JOBS_RUNNING.length === 0;

      if (RUNNER_TIMER >= idleTimeout) {
        shutdown({ ...opts, reason: `timeout:${idleTimeout}`, watcher });
      }

      RUNNER_TIMER = idle ? RUNNER_TIMER + 1 : 0;
    }, 1000);
  }

  if (!noRetry) {
    if (cml.driver === 'github') {
      const watcherSeventyTwo = setInterval(() => {
        RUNNER_JOBS_RUNNING.forEach((job) => {
          if (
            new Date().getTime() - new Date(job.date).getTime() >
            GH_5_MIN_TIMEOUT
          ) {
            shutdown({ ...opts, reason: 'timeout:35days' });
            clearInterval(watcherSeventyTwo);
          }
        });
      }, 60 * 1000);
    }
  }
};

const run = async (opts) => {
  opts.workdir = opts.workdir || `${homedir()}/.cml/${opts.name}`;

  process.on('unhandledRejection', (reason) =>
    shutdown({ ...opts, error: new Error(reason) })
  );
  process.on('uncaughtException', (error) => shutdown({ ...opts, error }));

  ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => shutdown({ ...opts, reason: signal }));
  });

  const { workdir, cloud, labels, name, reuse, reuseIdle, dockerVolumes } =
    opts;

  await cml.repoTokenCheck();

  const runners = await cml.runners();
  const runner = await cml.runnerByName({ name, runners });
  if (runner) {
    if (!reuse)
      throw new Error(
        `Runner name ${name} is already in use. Please change the name or terminate the existing runner.`
      );
    logger.info(`Reusing existing runner named ${name}...`);
    return;
  }

  if (
    reuse &&
    (await cml.runnersByLabels({ labels, runners })).find(
      (runner) => runner.online
    )
  ) {
    logger.info(`Reusing existing online runners with the ${labels} labels...`);
    return;
  }

  if (reuseIdle) {
    if (cml.driver === 'bitbucket') {
      throw new Error(
        'cml runner flag --reuse-idle is unsupported by bitbucket'
      );
    }
    logger.info(
      `Checking for existing idle runner matching labels: ${labels}.`
    );
    const currentRunners = await cml.runnersByLabels({ labels, runners });
    const availableRunner = currentRunners.find(
      (runner) => runner.online && !runner.busy
    );
    if (availableRunner) {
      logger.info('Found matching idle runner.', availableRunner);
      return;
    }
  }

  if (dockerVolumes.length && cml.driver !== 'gitlab')
    logger.warn('Parameters --docker-volumes is only supported in gitlab');

  if (cml.driver === 'github')
    logger.warn(
      'Github Actions timeout has been updated from 72h to 35 days. Update your workflow accordingly to be able to restart it automatically.'
    );

  if (RUNNER_NAME)
    logger.warn(
      'ignoring RUNNER_NAME environment variable, use CML_RUNNER_NAME or --name instead'
    );

  logger.info(`Preparing workdir ${workdir}...`);
  await fs.mkdir(workdir, { recursive: true });
  await fs.chmod(workdir, '766');

  if (cloud) await runCloud(opts);
  else await runLocal(opts);
};

const DESCRIPTION = 'Launch and register a self-hosted runner';
const DOCSURL = 'https://cml.dev/doc/ref/runner';

exports.command = 'launch';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  ({ cml } = opts);
  try {
    await run(opts);
  } catch (error) {
    await shutdown({ ...opts, error });
  }
};

exports.builder = (yargs) =>
  yargs
    .env('CML_RUNNER')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  labels: {
    type: 'string',
    default: 'cml',
    description:
      'One or more user-defined labels for this runner (delimited with commas)'
  },
  idleTimeout: {
    type: 'string',
    default: '5 minutes',
    coerce: (val) => (/^-?\d+$/.test(val) ? parseInt(val) : timestring(val)),
    description:
      'Time to wait for jobs before shutting down (e.g. "5min"). Use "never" to disable'
  },
  name: {
    type: 'string',
    default: `${randid()}`,
    defaultDescription: 'cml-{ID}',
    description: 'Name displayed in the repository once registered'
  },
  noRetry: {
    type: 'boolean',
    description:
      'Do not restart workflow terminated due to instance disposal or GitHub Actions timeout'
  },
  single: {
    type: 'boolean',
    conflicts: ['reuse', 'reuseIdle'],
    description: 'Exit after running a single job'
  },
  reuse: {
    type: 'boolean',
    conflicts: ['single', 'reuseIdle'],
    description:
      "Don't launch a new runner if an existing one has the same name or overlapping labels",
    telemetryData: 'name'
  },
  reuseIdle: {
    type: 'boolean',
    conflicts: ['reuse', 'single'],
    description:
      "Creates a new runner only if the matching labels don't exist or are already busy",
    telemetryData: 'name'
  },
  workdir: {
    type: 'string',
    hidden: true,
    alias: 'path',
    description: 'Runner working directory'
  },
  dockerVolumes: {
    type: 'array',
    default: [],
    description: 'Docker volumes, only supported in GitLab'
  },
  cloud: {
    type: 'string',
    choices: ['aws', 'azure', 'gcp', 'kubernetes'],
    description: 'Cloud to deploy the runner',
    telemetryData: 'full'
  },
  cloudRegion: {
    type: 'string',
    default: 'us-west',
    description:
      'Region where the instance is deployed. Choices: [us-east, us-west, eu-west, eu-north]. Also accepts native cloud regions'
  },
  cloudType: {
    type: 'string',
    description:
      'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro',
    telemetryData: 'full'
  },
  cloudPermissionSet: {
    type: 'string',
    default: '',
    description:
      'Specifies the instance profile in AWS or instance service account in GCP'
  },
  cloudMetadata: {
    type: 'array',
    string: true,
    default: [],
    coerce: (items) => {
      const keyValuePairs = items.map((item) => [...item.split(/=(.+)/), null]);
      return Object.fromEntries(keyValuePairs);
    },
    description:
      'Key Value pairs to associate cml-runner instance on the provider i.e. tags/labels "key=value"'
  },
  cloudGpu: {
    type: 'string',
    description:
      'GPU type. Choices: k80, v100, or native types e.g. nvidia-tesla-t4',
    coerce: (val) => (val === 'nogpu' ? undefined : val),
    telemetryData: 'full'
  },
  cloudHddSize: {
    type: 'number',
    description: 'HDD size in GB'
  },
  cloudSshPrivate: {
    type: 'string',
    description:
      'Custom private RSA SSH key. If not provided an automatically generated throwaway key will be used'
  },
  cloudSpot: {
    type: 'boolean',
    description: 'Request a spot instance'
  },
  cloudSpotPrice: {
    type: 'number',
    default: -1,
    description:
      'Maximum spot instance bidding price in USD. Defaults to the current spot bidding price',
    telemetryData: 'name'
  },
  cloudStartupScript: {
    type: 'string',
    description:
      'Run the provided Base64-encoded Linux shell script during the instance initialization',
    telemetryData: 'name'
  },
  cloudAwsSecurityGroup: {
    type: 'string',
    default: '',
    description: 'Specifies the security group in AWS'
  },
  cloudAwsSubnet: {
    type: 'string',
    default: '',
    description: 'Specifies the subnet to use within AWS',
    alias: 'cloud-aws-subnet-id'
  },
  cloudKubernetesNodeSelector: {
    type: 'array',
    string: true,
    default: [],
    coerce: (items) => {
      const keyValuePairs = items.map((item) => [...item.split(/=(.+)/), null]);
      return Object.fromEntries(keyValuePairs);
    },
    description:
      'Key Value pairs to specify the node selector to use within Kubernetes i.e. tags/labels "key=value". If not provided a default "accelerator=infer" key pair will be used'
  },
  cloudImage: {
    type: 'string',
    description: 'Custom machine/container image',
    hidden: true
  },
  tpiVersion: {
    type: 'string',
    default: '>= 0.9.10',
    description:
      'Pin the iterative/iterative terraform provider to a specific version. i.e. "= 0.10.4" See: https://www.terraform.io/language/expressions/version-constraints',
    hidden: true
  },
  cmlVersion: {
    type: 'string',
    default: require('../../../package.json').version,
    description: 'CML version to load on TPI instance',
    hidden: true
  },
  tfResource: {
    hidden: true,
    alias: 'tf_resource'
  },
  gcpAccessToken: {
    hidden: true
  },
  runnerPath: {
    hidden: true
  },
  destroyDelay: {
    type: 'number',
    default: 10,
    hidden: true,
    description:
      'Seconds to wait for collecting logs on failure (https://github.com/iterative/cml/issues/413)'
  }
});
exports.DOCSURL = DOCSURL;
