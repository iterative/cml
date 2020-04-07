#!/usr/bin/env node

const { exec, randid } = require('../src/utils');

const {
  RUNNER_TOKEN,
  RUNNER_NAME = randid(),
  RUNNER_LABELS,
  RUNNER_PATH,
  RUNNER_REPO,
  RUNNER_EXECUTOR = 'shell',
  RUNNER_RUNTIME = '',
  RUNNER_IMAGE = 'dvcorg/dvc-cml:latest'
} = process.env;

const IS_GITHUB = RUNNER_REPO && RUNNER_REPO.length;

const handle_error = err => {
  console.log(err.message);
  process.exit(1);
};

const shutdown = async () => {
  try {
    console.log('Unregistering runner');
    if (IS_GITHUB) {
      await exec(`${RUNNER_PATH}/config.sh remove --token "${RUNNER_TOKEN}"`);
    } else {
      await exec(`gitlab-runner verify --delete`);
      await exec(`gitlab-runner unregister --name "${RUNNER_NAME}"`);
    }

    return process.exit(0);
  } catch (err) {
    handle_error(err);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const run = async () => {
  if (!RUNNER_TOKEN) {
    throw new Error(
      'RUNNER_TOKEN is needed to start the runner. Are you setting a runner?'
    );
  }

  if (IS_GITHUB && RUNNER_EXECUTOR !== 'shell') {
    throw new Error('Github only supports shell executor');
  }

  if (IS_GITHUB && RUNNER_LABELS !== 'dvc-cml') {
    throw new Error('Github does not allow to set labels other than dvc-cml');
  }

  console.log(`Starting runner with ${RUNNER_EXECUTOR} executor`);

  if (IS_GITHUB) {
    console.log('Registering Github runner');
    console.log(
      await exec(
        `${RUNNER_PATH}/config.sh --url "${RUNNER_REPO}" --token "${RUNNER_TOKEN}" --name "${RUNNER_NAME}" --work "_work"`
      )
    );
    await exec(`${RUNNER_PATH}/run.sh`);
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
      --name "${RUNNER_NAME}"
    `)
    );

    console.log(await exec('gitlab-runner start'));

    setInterval(() => {}, 1 << 30);
  }
};

run().catch(err => {
  handle_error(err);
});
