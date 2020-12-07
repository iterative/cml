#!/usr/bin/env node

const yargs = require('yargs');

const { exec, randid } = require('../src/utils');
const CML = require('../src/cml');

let {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = randid(),
  RUNNER_TF_NAME,

  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token
} = process.env;

let cml;
let IS_GITHUB;
let TIMEOUT_TIMER = 0;
const JOBS_RUNNING = [];

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

const shutdown = async (opts) => {
  const { name, error } = opts;

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
    driver,
    repo,
    token,
    name,
    labels,
    'idle-timeout': idle_timeout
  } = opts;
  cml = new CML({ driver, repo, token });

  IS_GITHUB = cml.driver === 'github';
  RUNNER_NAME = name;

  try {
    await cml.runner_token();
  } catch (err) {
    throw new Error(
      'repo_token does not have enough permissions to access CI jobs'
    );
  }

  console.log(`Starting ${cml.driver} runner`);
  const proc = await cml.start_runner({
    path: './runner',
    name,
    labels,
    idle_timeout
  });

  proc.on('exit', () => {
    shutdown(opts);
  });
  proc.stderr.on('data', (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));
  });
  proc.stdout.on('data', (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      JOBS_RUNNING.push(1);
      TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      JOBS_RUNNING.pop();
    }
  });

  if (IS_GITHUB && parseInt(idle_timeout) !== 0) {
    const watcher = setInterval(() => {
      TIMEOUT_TIMER >= idle_timeout && shutdown(opts) && clearInterval(watcher);

      if (!JOBS_RUNNING.length) TIMEOUT_TIMER++;
    }, 1000);
  }
};

const argv = yargs
  .usage(`Usage: $0`)
  .default('labels', RUNNER_LABELS)
  .describe('labels', 'Comma delimited runner labels')
  .default('idle-timeout', RUNNER_IDLE_TIMEOUT)
  .describe(
    'idle-timeout',
    'Time in seconds for the runner to be waiting for jobs before shutting down'
  )
  .default('name', RUNNER_NAME)
  .describe('name', 'Name displayed in the repo once registered')
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
  .default('driver', RUNNER_DRIVER)
  .choices('driver', ['github', 'gitlab'])
  .describe('driver', 'If not specify it infers it from the ENV.')

  .help('h').argv;
run(argv).catch((error) => {
  shutdown({ error });
});
