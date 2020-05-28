#!/usr/bin/env node

const { spawn } = require('child_process');
const { exec, randid } = require('../src/utils');

const {
  DOCKER_MACHINE,
  RUNNER_IDLE_TIMEOUT = 5 * 60 * 1000,

  RUNNER_REPO,

  RUNNER_PATH,
  RUNNER_LABELS = '',
  RUNNER_NAME = randid(),
  RUNNER_EXECUTOR = 'shell',
  RUNNER_RUNTIME = '',
  RUNNER_IMAGE = 'davidgortega/cml:latest'
} = process.env;

const IS_GITHUB = RUNNER_REPO.startsWith('https://github.com/');
let TIMEOUT_TIMER = 0;

process.env.GITHUB_REPOSITORY = RUNNER_REPO.replace('https://github.com/', '');
process.env.CI_PROJECT_PATH = RUNNER_REPO.replace('https://gitlab.com/', '');
const { get_runner_token } = IS_GITHUB
  ? require('../src/github')
  : require('../src/gitlab');
let RUNNER_TOKEN;

const shutdown_docker_machine = async () => {
  console.log('Shutting down docker machine');
  try {
    DOCKER_MACHINE &&
      console.log(await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`));
  } catch (err) {
    console.log(err.message);
  }
};

const shutdown = async error => {
  try {
    console.log('Unregistering runner');

    try {
      if (IS_GITHUB) {
        console.log(
          await exec(
            `${RUNNER_PATH}/config.sh remove --token "${RUNNER_TOKEN}"`
          )
        );
      } else {
        console.log(await exec(`gitlab-runner verify --delete`));
        console.log(
          await exec(`gitlab-runner unregister --name "${RUNNER_NAME}"`)
        );
      }
    } catch (err) {}

    await shutdown_docker_machine();

    return process.exit(error ? 1 : 0);
  } catch (err) {
    console.error(err);
    return process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const run = async () => {
  RUNNER_TOKEN = await get_runner_token();
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
    console.log(
      await exec(`gitlab-runner register \
      --non-interactive \
      --run-untagged="true" \
      --locked="false" \
      --access-level="not_protected" \
      --executor "${RUNNER_EXECUTOR}" \
      --docker-runtime "${RUNNER_RUNTIME}" \
      --docker-image "${RUNNER_IMAGE}" \
      --url "https://gitlab.com/" \
      --tag-list "${RUNNER_LABELS}" \
      --registration-token "${RUNNER_TOKEN}" \
      --name "${RUNNER_NAME}"`)
    );

    command = 'gitlab-runner start';
  }

  const proc = spawn(command, {
    shell: true
  });

  proc.stderr.on('data', data => {
    data && console.log(data.toString('utf8'));
  });

  proc.stdout.on('data', async data => {
    data && console.log(data.toString('utf8'));

    if (data && IS_GITHUB && data.includes('Running job')) TIMEOUT_TIMER = 0;
  });

  setInterval(() => {
    IS_GITHUB && TIMEOUT_TIMER >= RUNNER_IDLE_TIMEOUT && shutdown();
    TIMEOUT_TIMER++;
  }, 1000);
};

run().catch(err => {
  console.error(err.message);
  shutdown(err);
});
