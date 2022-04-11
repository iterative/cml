const { join } = require('path');
const { homedir } = require('os');
const fs = require('fs').promises;
const { SpotNotifier } = require('ec2-spot-notification');
const kebabcaseKeys = require('kebabcase-keys');
const timestring = require('timestring');
const winston = require('winston');
const CML = require('../../src/cml').default;
const { exec, randid, sleep } = require('../../src/utils');
const tf = require('../../src/terraform');

let cml;
let RUNNER;
let RUNNER_ID;
let RUNNER_JOBS_RUNNING = [];
let RUNNER_SHUTTING_DOWN = false;
const GH_5_MIN_TIMEOUT = (72 * 60 - 5) * 60 * 1000;

const shutdown = async (opts) => {
  if (RUNNER_SHUTTING_DOWN) return;
  RUNNER_SHUTTING_DOWN = true;

  const { error, cloud } = opts;
  const {
    name,
    workdir = '',
    tfResource,
    noRetry,
    reason,
    destroyDelay,
    dockerMachine
  } = opts;
  const tfPath = workdir;

  const unregisterRunner = async () => {
    if (!RUNNER) return;

    try {
      winston.info(`Unregistering runner ${name}...`);
      RUNNER && RUNNER.kill('SIGINT');
      await cml.unregisterRunner({ name });
      winston.info('\tSuccess');
    } catch (err) {
      winston.error(`\tFailed: ${err.message}`);
    }
  };

  const retryWorkflows = async () => {
    try {
      if (!noRetry) {
        if (cml.driver === 'github') {
          const job = await cml.runnerJob({ runnerId: RUNNER_ID });
          if (job) RUNNER_JOBS_RUNNING = [job];
        }

        if (RUNNER_JOBS_RUNNING.length > 0) {
          await Promise.all(
            RUNNER_JOBS_RUNNING.map(
              async (job) => await cml.pipelineRestart({ jobId: job.id })
            )
          );
        }
      }
    } catch (err) {
      winston.error(err);
    }
  };

  const destroyDockerMachine = async () => {
    if (!dockerMachine) return;

    winston.info('docker-machine destroy...');
    winston.warning(
      'Docker machine is deprecated and will be removed!! Check how to deploy using our tf provider.'
    );
    try {
      await exec(`echo y | docker-machine rm ${dockerMachine}`);
    } catch (err) {
      winston.error(`\tFailed shutting down docker machine: ${err.message}`);
    }
  };

  const destroyTerraform = async () => {
    if (!tfResource) return;

    try {
      winston.debug(await tf.destroy({ dir: tfPath }));
    } catch (err) {
      winston.error(`\tFailed destroying terraform: ${err.message}`);
    }
  };

  if (error) {
    winston.error(error, { reason, status: 'terminated' });
  } else {
    winston.info('runner status', { reason, status: 'terminated' });
  }

  winston.info(`waiting ${destroyDelay} seconds before exiting...`);
  await sleep(destroyDelay);

  if (!cloud) {
    try {
      await unregisterRunner();
      await retryWorkflows();
    } catch (err) {
      winston.error(`Error connecting the SCM: ${err.message}`);
    }

    await destroyDockerMachine();
  }

  await destroyTerraform();

  process.exit(error ? 1 : 0);
};

const runCloud = async (opts) => {
  const runTerraform = async (opts) => {
    winston.info('Terraform apply...');

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
        winston.warn(
          'GPU model "tesla" has been deprecated; please use "v100" instead.'
        );
      tpl = tf.iterativeCmlRunnerTpl({
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
        dockerVolumes
      });
    }

    await fs.writeFile(tfMainPath, tpl);
    await tf.init({ dir: tfPath });
    await tf.apply({ dir: tfPath });

    const tfStatePath = join(tfPath, 'terraform.tfstate');
    const tfstate = await tf.loadTfState({ path: tfStatePath });

    return tfstate;
  };

  winston.info('Deploying cloud runner plan...');
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
          timeouts: attributes.timeouts
        };
        winston.info(JSON.stringify(nonSensitiveValues));
      }
    }
  }
};

const runLocal = async (opts) => {
  winston.info(`Launching ${cml.driver} runner`);
  const { workdir, name, labels, single, idleTimeout, noRetry, dockerVolumes } =
    opts;

  const dataHandler = async (data) => {
    const log = cml.parseRunnerLog({ data });
    log && winston.info('runner status', log);

    if (log && log.status === 'job_started') {
      RUNNER_JOBS_RUNNING.push({ id: log.job, date: log.date });
    } else if (log && log.status === 'job_ended') {
      const { job: jobId } = log;
      RUNNER_JOBS_RUNNING = RUNNER_JOBS_RUNNING.filter(
        (job) => job.id !== jobId
      );
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

  proc.stderr.on('data', dataHandler);
  proc.stdout.on('data', dataHandler);
  proc.on('disconnect', () =>
    shutdown({ ...opts, reason: `runner disconnected` })
  );
  proc.on('close', (exit) =>
    shutdown({ ...opts, reason: `runner closed with exit code ${exit}` })
  );

  RUNNER = proc;
  ({ id: RUNNER_ID } = await cml.runnerByName({ name }));

  if (parseInt(idleTimeout) > 0) {
    const watcher = setInterval(async () => {
      let idle = RUNNER_JOBS_RUNNING.length === 0;

      try {
        if (cml.driver === 'github') {
          const job = await cml.runnerJob({ runnerId: RUNNER_ID });

          if (!job && !idle) {
            winston.error(
              `Runner is idle as per the GitHub API but busy as per CML internal state. Resetting jobs. Retrying in ${idleTimeout} seconds...`
            );
            winston.warn(`CML GitHub driver response: ${JSON.stringify(job)}`);
            winston.warn(
              `CML internal state: ${JSON.stringify(RUNNER_JOBS_RUNNING)}`
            );

            RUNNER_JOBS_RUNNING = [];
          }

          if (job && idle) {
            winston.error(
              `Runner is busy as per the GitHub API but idle as per CML internal state. Retrying in ${idleTimeout} seconds...`
            );

            idle = false;
          }
        }
      } catch (err) {
        winston.error(
          `Error connecting the SCM: ${err.message}. Will try again in ${idleTimeout} secs`
        );

        idle = false;
      }

      if (idle) {
        shutdown({ ...opts, reason: `timeout:${idleTimeout}` });
        clearInterval(watcher);
      }
    }, idleTimeout * 1000);
  }

  if (!noRetry) {
    try {
      winston.info(`EC2 id ${await SpotNotifier.instanceId()}`);
      SpotNotifier.on('termination', () =>
        shutdown({ ...opts, reason: 'spot_termination' })
      );
      SpotNotifier.start();
    } catch (err) {
      winston.warn('SpotNotifier can not be started.');
    }

    if (cml.driver === 'github') {
      const watcherSeventyTwo = setInterval(() => {
        RUNNER_JOBS_RUNNING.forEach((job) => {
          if (
            new Date().getTime() - new Date(job.date).getTime() >
            GH_5_MIN_TIMEOUT
          ) {
            shutdown({ ...opts, reason: 'timeout:72h' });
            clearInterval(watcherSeventyTwo);
          }
        });
      }, 60 * 1000);
    }
  }
};

const run = async (opts) => {
  ['SIGTERM', 'SIGINT', 'SIGQUIT'].forEach((signal) => {
    process.on(signal, () => shutdown({ ...opts, reason: signal }));
  });

  opts.workdir = opts.workdir || `${homedir()}/.cml/${opts.name}`;
  const {
    tpiVersion,
    driver,
    repo,
    token,
    cloud,
    labels,
    name,
    reuse,
    dockerVolumes,
    tfResource,
    workdir
  } = opts;

  cml = new CML({ driver, repo, token });

  await cml.repoTokenCheck();

  if (dockerVolumes.length && cml.driver !== 'gitlab')
    winston.warn('Parameters --docker-volumes is only supported in gitlab');

  if (cloud || tfResource) await tf.checkMinVersion();

  // prepare tf
  if (tfResource) {
    const tfPath = workdir;

    await fs.mkdir(tfPath, { recursive: true });
    const tfMainPath = join(tfPath, 'main.tf');
    const tpl = tf.iterativeProviderTpl({ tpiVersion });
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

  const runners = await cml.runners();
  const runner = await cml.runnerByName({ name, runners });
  if (runner) {
    if (!reuse)
      throw new Error(
        `Runner name ${name} is already in use. Please change the name or terminate the existing runner.`
      );
    winston.info(`Reusing existing runner named ${name}...`);
    process.exit(0);
  }

  if (
    reuse &&
    (await cml.runnersByLabels({ labels, runners })).find(
      (runner) => runner.online
    )
  ) {
    winston.info(
      `Reusing existing online runners with the ${labels} labels...`
    );
    process.exit(0);
  }

  try {
    winston.info(`Preparing workdir ${workdir}...`);
    await fs.mkdir(workdir, { recursive: true });
  } catch (err) {}

  if (cloud) await runCloud(opts);
  else await runLocal(opts);
};

exports.command = 'runner';
exports.description = 'Launch and register a self-hosted runner';

exports.handler = async (opts) => {
  if (process.env.RUNNER_NAME) {
    winston.warn(
      'ignoring RUNNER_NAME environment variable, use CML_RUNNER_NAME or --name instead'
    );
  }
  try {
    await run(opts);
  } catch (error) {
    await shutdown({ ...opts, error });
    throw error;
  }
};

exports.builder = (yargs) =>
  yargs.env('CML_RUNNER').options(
    kebabcaseKeys({
      tpiVersion: {
        type: 'string',
        default: '>= 0.9.10',
        description:
          'Pin the iterative/iterative terraform provider to a specific version. i.e. "= 0.10.4" See: https://www.terraform.io/language/expressions/version-constraints'
      },
      dockerVolumes: {
        type: 'array',
        default: [],
        description: 'Docker volumes. This feature is only supported in GitLab'
      },
      labels: {
        type: 'string',
        default: 'cml',
        description:
          'One or more user-defined labels for this runner (delimited with commas)'
      },
      idleTimeout: {
        type: 'string',
        default: '5 minutes',
        coerce: (val) =>
          /^-?\d+$/.test(val) ? parseInt(val) : timestring(val),
        description:
          'Time to wait for jobs before shutting down (e.g. "5min"). Use "never" to disable'
      },
      name: {
        type: 'string',
        default: `cml-${randid()}`,
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
        description: 'Exit after running a single job'
      },
      reuse: {
        type: 'boolean',
        description:
          "Don't launch a new runner if an existing one has the same name or overlapping labels"
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab'],
        description:
          'Platform where the repository is hosted. If not specified, it will be inferred from the environment'
      },
      repo: {
        type: 'string',
        description:
          'Repository to be used for registering the runner. If not specified, it will be inferred from the environment'
      },
      token: {
        type: 'string',
        description:
          'Personal access token to register a self-hosted runner on the repository. If not specified, it will be inferred from the environment'
      },
      cloud: {
        type: 'string',
        choices: ['aws', 'azure', 'gcp', 'kubernetes'],
        description: 'Cloud to deploy the runner'
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
          'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro'
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
          const keyValuePairs = items.map((item) => [
            ...item.split(/=(.+)/),
            null
          ]);
          return Object.fromEntries(keyValuePairs);
        },
        description:
          'Key Value pairs to associate cml-runner instance on the provider i.e. tags/labels "key=value"'
      },
      cloudGpu: {
        type: 'string',
        choices: ['nogpu', 'k80', 'v100', 'tesla'],
        coerce: (val) => (val === 'nogpu' ? undefined : val),
        description: 'GPU type.'
      },
      cloudHddSize: {
        type: 'number',
        description: 'HDD size in GB'
      },
      cloudSshPrivate: {
        type: 'string',
        coerce: (val) => val && val.replace(/\n/g, '\\n'),
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
          'Maximum spot instance bidding price in USD. Defaults to the current spot bidding price'
      },
      cloudStartupScript: {
        type: 'string',
        description:
          'Run the provided Base64-encoded Linux shell script during the instance initialization'
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
      cmlVersion: {
        type: 'string',
        default: require('../../package.json').version,
        description: 'CML version to load on TPI instance',
        hidden: true
      },
      tfResource: {
        hidden: true,
        alias: 'tf_resource'
      },
      destroyDelay: {
        type: 'number',
        default: 10,
        hidden: true,
        description:
          'Seconds to wait for collecting logs on failure (https://github.com/iterative/cml/issues/413)'
      },
      dockerMachine: {
        type: 'string',
        hidden: true,
        description: 'Legacy docker-machine environment variable'
      },
      workdir: {
        type: 'string',
        hidden: true,
        alias: 'path',
        description: 'Runner working directory'
      }
    })
  );
