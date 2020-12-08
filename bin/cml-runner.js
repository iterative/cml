#!/usr/bin/env node

const { resolve } = require('path');
const yargs = require('yargs');

const { exec, randid } = require('../src/utils');
const CML = require('../src/cml');

const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH = '.',
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = randid(),
  RUNNER_TF_NAME,

  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token
} = process.env;

let cml;
let TIMEOUT_TIMER = 0;
const JOBS_RUNNING = [];

const shutdown = async (opts) => {
  const { name, error } = opts;

  const shutdown_docker_machine = async () => {
    if (DOCKER_MACHINE) {
      console.log('docker-machine destroy...');
      console.log(
        'Docker machine is deprecated and this will be removed!! Check how to deploy using our tf provider.'
      );
      try {
        console.log(await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`));
      } catch (err) {
        console.log(`Failed shutting down docker machine: ${err.message}`);
      }
    }
  };

  const shutdown_cloud = async () => {
    try {
      console.log('Terraform destroy...');
      const tf_resource = RUNNER_TF_NAME ? `-target=${RUNNER_TF_NAME}` : '';
      console.log(
        await exec(
          `terraform init && terraform destroy -auto-approve ${tf_resource}`
        )
      );
    } catch (err) {
      console.log(`Failed destroying terraform: ${err.message}`);
    }
  };

  try {
    try {
      console.log('Unregistering runner');
      await cml.unregister_runner({ name });
    } catch (err) {
      console.log('Failed unregistering runner');
    }

    await shutdown_docker_machine();
    await shutdown_cloud();

    if (error) throw error;

    return process.exit(0);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
};

const run = async (opts) => {
  process.on('SIGTERM', () => shutdown(opts));
  process.on('SIGINT', () => shutdown(opts));
  process.on('SIGQUIT', () => shutdown(opts));

  const {
    workspace: path,
    driver,
    repo,
    token,
    name,
    labels,
    'idle-timeout': idle_timeout
  } = opts;
  cml = new CML({ driver, repo, token });

  try {
    await cml.runner_token();
  } catch (err) {
    throw new Error(
      'repo_token does not have enough permissions to access CI jobs'
    );
  }

  console.log(`Starting ${cml.driver} runner`);
  const proc = await cml.start_runner({
    path,
    name,
    labels,
    idle_timeout
  });

  const data_handler = (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      JOBS_RUNNING.push(1);
      TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      JOBS_RUNNING.pop();
    }
  };
  proc.stderr.on('data', data_handler);
  proc.stdout.on('data', data_handler);
  proc.on('exit', () => {
    shutdown(opts);
  });

  if (parseInt(idle_timeout) !== 0) {
    const watcher = setInterval(() => {
      TIMEOUT_TIMER >= idle_timeout && shutdown(opts) && clearInterval(watcher);

      if (!JOBS_RUNNING.length) TIMEOUT_TIMER++;
    }, 1000);
  }
};

const argv = yargs
  .usage(`Usage: $0`)
  .default('workspace', RUNNER_PATH)
  .describe(
    'workspace',
    'Runner workspace location. Defaults to current directory.'
  )
  .coerce('workspace', (path) => resolve(__dirname, path))
  .default('labels', RUNNER_LABELS)
  .describe('labels', 'Comma delimited runner labels')
  .default('idle-timeout', RUNNER_IDLE_TIMEOUT)
  .describe(
    'idle-timeout',
    'Time in seconds for the runner to be waiting for jobs before shutting down'
  )
  .default('name', RUNNER_NAME)
  .describe('name', 'Name displayed in the repo once registered')
  .default('driver', RUNNER_DRIVER)
  .choices('driver', ['github', 'gitlab'])
  .describe('driver', 'If not specify it infers it from the ENV.')
  .default('repo', RUNNER_REPO)
  .describe(
    'repo',
    'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
  )
  .default('token', repo_token)
  .describe(
    'token',
    'Personal access token to be used. If not specified in extracted from ENV repo_token or GITLAB_TOKEN.'
  )
  .help('h').argv;
run(argv).catch((error) => {
  shutdown({ error });
});
