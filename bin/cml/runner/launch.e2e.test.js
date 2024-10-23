jest.setTimeout(2000000);

const isIp = require('is-ip');
const { CML } = require('../../../src/cml');
const { exec, sshConnection, randid, sleep } = require('../../../src/utils');

const IDLE_TIMEOUT = 15;
const {
  TEST_GITHUB_TOKEN,
  TEST_GITHUB_REPOSITORY,
  TEST_GITLAB_TOKEN,
  TEST_GITLAB_REPOSITORY,
  SSH_PRIVATE
} = process.env;

const launchRunner = async (opts) => {
  const { cloud, type, repo, token, privateKey, name } = opts;
  const output = await exec(
    'node',
    './bin/cml.js',
    'runner',
    '--cloud',
    cloud,
    '--cloud-type',
    type,
    '--repo',
    repo,
    '--token',
    token,
    '--cloud-ssh-private',
    privateKey,
    '--name',
    name,
    '--cloud-spot',
    'true',
    '--idle-timeout',
    IDLE_TIMEOUT
  );
  const state = JSON.parse(output.split(/\n/).pop());

  return state;
};

const testRunner = async (opts) => {
  const { repo, token, name, privateKey } = opts;
  const { instanceIp: host } = await launchRunner(opts);
  expect(isIp(host)).toBe(true);

  const sshOpts = { host, username: 'ubuntu', privateKey };
  const cml = new CML({ repo, token });

  let runner = await cml.runnerByName({ name });
  expect(runner).not.toBe(undefined);
  await sshConnection(sshOpts);

  await sleep(IDLE_TIMEOUT + 60);

  runner = await cml.runnerByName({ name });
  expect(runner).toBe(undefined);

  let sshErr;
  try {
    await sshConnection(sshOpts);
  } catch (err) {
    sshErr = err;
  }
  expect(sshErr).not.toBe(undefined);
};

describe('CML e2e', () => {
  test.skip('cml-runner GL/AWS', async () => {
    const opts = {
      repo: TEST_GITLAB_REPOSITORY,
      token: TEST_GITLAB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'aws',
      type: 't2.micro',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test.skip('cml-runner GH/AWS', async () => {
    const opts = {
      repo: TEST_GITHUB_REPOSITORY,
      token: TEST_GITHUB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'aws',
      type: 't2.micro',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test.skip('cml-runner GL/Azure', async () => {
    const opts = {
      repo: TEST_GITLAB_REPOSITORY,
      token: TEST_GITLAB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'azure',
      type: 'm',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test.skip('cml-runner GH/Azure', async () => {
    const opts = {
      repo: TEST_GITHUB_REPOSITORY,
      token: TEST_GITHUB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'azure',
      type: 'm',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test.skip('cml-runner GL/GCP', async () => {
    const opts = {
      repo: TEST_GITLAB_REPOSITORY,
      token: TEST_GITLAB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'gcp',
      type: 'm',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test.skip('cml-runner GH/GCP', async () => {
    const opts = {
      repo: TEST_GITHUB_REPOSITORY,
      token: TEST_GITHUB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'gcp',
      type: 'm',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });
});
