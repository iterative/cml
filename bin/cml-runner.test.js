jest.setTimeout(2000000);

const isIp = require('is-ip');
const { CML } = require('../src/cml');
const { exec, sshConnection, randid, sleep } = require('../src/utils');

const IDLE_TIMEOUT = 15;
const {
  TEST_GITHUB_TOKEN,
  TEST_GITHUB_REPO,
  TEST_GITLAB_TOKEN,
  TEST_GITLAB_REPO,
  SSH_PRIVATE
} = process.env;

const launchRunner = async (opts) => {
  const { cloud, type, repo, token, privateKey, name } = opts;
  const command = `node ./bin/cml-runner.js --cloud ${cloud} --cloud-type ${type} --repo ${repo} --token ${token} --cloud-ssh-private="${privateKey}" --name ${name} --cloud-spot true --idle-timeout ${IDLE_TIMEOUT}`;

  const output = await exec(command);
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

describe('Runner integration tests', () => {
  test('cml-runner -h', async () => {
    const output = await exec(`node ./bin/cml-runner.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-runner.js

      Options:
        --version                   Show version number                      [boolean]
        --labels                    One or more user-defined labels for this runner
                                    (delimited with commas)           [default: \\"cml\\"]
        --idle-timeout              Time in seconds for the runner to be waiting for
                                    jobs before shutting down. Setting it to 0
                                    disables automatic shutdown         [default: 300]
        --name                      Name displayed in the repository once registered
                                    cml-{ID}
        --no-retry                  Do not restart workflow terminated due to instance
                                    disposal or GitHub Actions timeout
                                                            [boolean] [default: false]
        --single                    Exit after running a single job
                                                            [boolean] [default: false]
        --reuse                     Don't launch a new runner if an existing one has
                                    the same name or overlapping labels
                                                            [boolean] [default: false]
        --driver                    Platform where the repository is hosted. If not
                                    specified, it will be inferred from the
                                    environment          [choices: \\"github\\", \\"gitlab\\"]
        --repo                      Repository to be used for registering the runner.
                                    If not specified, it will be inferred from the
                                    environment
        --token                     Personal access token to register a self-hosted
                                    runner on the repository. If not specified, it
                                    will be inferred from the environment
        --cloud                     Cloud to deploy the runner
                                        [choices: \\"aws\\", \\"azure\\", \\"gcp\\", \\"kubernetes\\"]
        --cloud-region              Region where the instance is deployed. Choices:
                                    [us-east, us-west, eu-west, eu-north]. Also
                                    accepts native cloud regions  [default: \\"us-west\\"]
        --cloud-type                Instance type. Choices: [m, l, xl]. Also supports
                                    native types like i.e. t2.micro
        --cloud-gpu                 GPU type.
                                            [choices: \\"nogpu\\", \\"k80\\", \\"v100\\", \\"tesla\\"]
        --cloud-hdd-size            HDD size in GB
        --cloud-ssh-private         Custom private RSA SSH key. If not provided an
                                    automatically generated throwaway key will be used
                                                                         [default: \\"\\"]
        --cloud-spot                Request a spot instance                  [boolean]
        --cloud-spot-price          Maximum spot instance bidding price in USD.
                                    Defaults to the current spot bidding price
                                                                       [default: \\"-1\\"]
        --cloud-startup-script      Run the provided Base64-encoded Linux shell script
                                    during the instance initialization   [default: \\"\\"]
        --cloud-aws-security-group  Specifies the security group in AWS  [default: \\"\\"]
        -h                          Show help                                [boolean]"
    `);
  });

  test.skip('cml-runner GL/AWS', async () => {
    const opts = {
      repo: TEST_GITLAB_REPO,
      token: TEST_GITLAB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'aws',
      type: 't2.micro',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });

  test('cml-runner GH/AWS', async () => {
    const opts = {
      repo: TEST_GITHUB_REPO,
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
      repo: TEST_GITLAB_REPO,
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
      repo: TEST_GITHUB_REPO,
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
      repo: TEST_GITLAB_REPO,
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
      repo: TEST_GITHUB_REPO,
      token: TEST_GITHUB_TOKEN,
      privateKey: SSH_PRIVATE,
      cloud: 'gcp',
      type: 'm',
      name: `cml-test-${randid()}`
    };

    await testRunner(opts);
  });
});
