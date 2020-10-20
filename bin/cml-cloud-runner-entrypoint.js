#!/usr/bin/env node

const { spawn } = require('child_process');

const { exec, randid } = require('../src/utils');
const CML = require('../src/cml');

const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH,
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = randid(),
  RUNNER_EXECUTOR = 'shell',
  RUNNER_RUNTIME = '',
  RUNNER_IMAGE = 'dvcorg/cml:latest',

  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token
} = process.env;

const cml = new CML({
  driver: RUNNER_DRIVER,
  repo: RUNNER_REPO,
  token: repo_token
});
const IS_GITHUB = cml.driver === 'github';
const { protocol, host } = new URL(RUNNER_REPO);
const RUNNER_REPO_ORIGIN = `${protocol}//${host}`;

let TIMEOUT_TIMER = 0;
let JOB_RUNNING = false;
let RUNNER_TOKEN;
let GITLAB_CI_TOKEN;

const shutdown_docker_machine = async () => {
  console.log('Shutting down docker machine');
  try {
    DOCKER_MACHINE &&
      console.log(await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`));
  } catch (err) {
    console.log(`Failed shutting down docker machine: ${err.message}`);
  }
};

const shutdown_host = async () => {
  try {
    console.log('Terraform destroy...');
    try {
      console.log(
        await exec('cd / && terraform init && terraform destroy -auto-approve')
      );
    } catch (err) {
      console.log(`Failed destroying terraform: ${err.message}`);
    }
  } catch (err) {
    console.log(err.message);
  }
};

const shutdown = async (error) => {
  try {
    console.log('Unregistering runner');

    try {
      if (IS_GITHUB) {
        await cml.unregister_runner({ name: RUNNER_NAME });
      } else {
        console.log(await exec(`gitlab-runner verify --delete`));
        console.log(
          await exec(
            `gitlab-runner unregister --url "${RUNNER_REPO_ORIGIN}" --token "${GITLAB_CI_TOKEN}" `
          )
        );
      }
    } catch (err) {
      console.log(err);
    }

    await shutdown_docker_machine();
    await shutdown_host();

    if (error) throw error;

    return process.exit(0);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('SIGQUIT', shutdown);
const run = async () => {
  RUNNER_TOKEN = await cml.runner_token();

  if (!RUNNER_TOKEN) {
    throw new Error(
      'RUNNER_TOKEN is needed to start the runner. Are you setting a runner?'
    );
  }

  if (IS_GITHUB && RUNNER_EXECUTOR !== 'shell') {
    throw new Error('Github only supports shell executor');
  }

  console.log(`Starting runner with ${RUNNER_EXECUTOR} executor`);

  let command;
  if (IS_GITHUB) {
    console.log('Registering Github runner');
    console.log(
      await exec(
        `${RUNNER_PATH}/config.sh --url "${RUNNER_REPO}" --token "${RUNNER_TOKEN}" --name "${RUNNER_NAME}" --labels "${RUNNER_LABELS}" --work "_work"`
      )
    );

    command = `${RUNNER_PATH}/run.sh`;
  } else {
    console.log('Registering Gitlab runner');
    const runner = await cml.register_runner({
      tags: RUNNER_LABELS,
      runner_token: RUNNER_TOKEN
    });

    GITLAB_CI_TOKEN = runner.token;

    command = `gitlab-runner --log-format="json" run-single \
      --token "${runner.token}" \
      --url "${RUNNER_REPO_ORIGIN}" \
      --executor "${RUNNER_EXECUTOR}" \
      --docker-runtime "${RUNNER_RUNTIME}" \
      --docker-image "${RUNNER_IMAGE}" \
      --wait-timeout ${RUNNER_IDLE_TIMEOUT} \
      --name "${RUNNER_NAME}" \
      --request-concurrency 1 \
      --limit 1`;
  }

  const proc = spawn(command, { shell: true });

  proc.stderr.on('data', (data) => {
    data && console.log(data.toString('utf8'));

    if (data && !IS_GITHUB) {
      try {
        const { msg } = JSON.parse(data);
        msg.includes('runner has not received a job') && shutdown();
      } catch (err) {}
    }
  });

  proc.stdout.on('data', async (data) => {
    data && console.log(data.toString('utf8'));

    if (data && IS_GITHUB && data.includes('Running job')) {
      JOB_RUNNING = true;
      TIMEOUT_TIMER = 0;
    }

    if (
      data &&
      IS_GITHUB &&
      data.includes('Job') &&
      data.includes('completed with result')
    ) {
      JOB_RUNNING = false;
    }
  });

  if (IS_GITHUB && parseInt(RUNNER_IDLE_TIMEOUT) !== 0) {
    const watcher = setInterval(() => {
      TIMEOUT_TIMER >= RUNNER_IDLE_TIMEOUT &&
        shutdown() &&
        clearInterval(watcher);

      if (!JOB_RUNNING) TIMEOUT_TIMER++;
    }, 1000);
  }
};

run().catch((err) => {
  shutdown(err);
});
