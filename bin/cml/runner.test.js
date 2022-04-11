jest.setTimeout(2000000);

const isIp = require('is-ip');
const { CML } = require('../..//src/cml');
const { exec, sshConnection, randid, sleep } = require('../../src/utils');

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
  const command = `node ./bin/cml.js runner --cloud ${cloud} --cloud-type ${type} --repo ${repo} --token ${token} --cloud-ssh-private="${privateKey}" --name ${name} --cloud-spot true --idle-timeout ${IDLE_TIMEOUT}`;

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

describe('CML e2e', () => {
  test('cml-runner --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js runner --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js runner

      Launch and register a self-hosted runner

      Options:
        --help                                    Show help                  [boolean]
        --version                                 Show version number        [boolean]
        --log                                     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --tpi-version                             Pin the iterative/iterative
                                                  terraform provider to a specific
                                                  version. i.e. \\"= 0.10.4\\" See:
                                                  https://www.terraform.io/language/ex
                                                  pressions/version-constraints
                                                       [string] [default: \\">= 0.9.10\\"]
        --docker-volumes                          Docker volumes. This feature is only
                                                  supported in GitLab
                                                                 [array] [default: []]
        --labels                                  One or more user-defined labels for
                                                  this runner (delimited with commas)
                                                             [string] [default: \\"cml\\"]
        --idle-timeout                            Time to wait for jobs before
                                                  shutting down (e.g. \\"5min\\"). Use
                                                  \\"never\\" to disable
                                                       [string] [default: \\"5 minutes\\"]
        --name                                    Name displayed in the repository
                                                  once registered
                                                          [string] [default: cml-{ID}]
        --no-retry                                Do not restart workflow terminated
                                                  due to instance disposal or GitHub
                                                  Actions timeout            [boolean]
        --single                                  Exit after running a single job
                                                                             [boolean]
        --reuse                                   Don't launch a new runner if an
                                                  existing one has the same name or
                                                  overlapping labels         [boolean]
        --driver                                  Platform where the repository is
                                                  hosted. If not specified, it will be
                                                  inferred from the environment
                                                [string] [choices: \\"github\\", \\"gitlab\\"]
        --repo                                    Repository to be used for
                                                  registering the runner. If not
                                                  specified, it will be inferred from
                                                  the environment             [string]
        --token                                   Personal access token to register a
                                                  self-hosted runner on the
                                                  repository. If not specified, it
                                                  will be inferred from the
                                                  environment                 [string]
        --cloud                                   Cloud to deploy the runner
                               [string] [choices: \\"aws\\", \\"azure\\", \\"gcp\\", \\"kubernetes\\"]
        --cloud-region                            Region where the instance is
                                                  deployed. Choices: [us-east,
                                                  us-west, eu-west, eu-north]. Also
                                                  accepts native cloud regions
                                                         [string] [default: \\"us-west\\"]
        --cloud-type                              Instance type. Choices: [m, l, xl].
                                                  Also supports native types like i.e.
                                                  t2.micro                    [string]
        --cloud-permission-set                    Specifies the instance profile in
                                                  AWS or instance service account in
                                                  GCP           [string] [default: \\"\\"]
        --cloud-metadata                          Key Value pairs to associate
                                                  cml-runner instance on the provider
                                                  i.e. tags/labels \\"key=value\\"
                                                                 [array] [default: []]
        --cloud-gpu                               GPU type.
                                   [string] [choices: \\"nogpu\\", \\"k80\\", \\"v100\\", \\"tesla\\"]
        --cloud-hdd-size                          HDD size in GB              [number]
        --cloud-ssh-private                       Custom private RSA SSH key. If not
                                                  provided an automatically generated
                                                  throwaway key will be used  [string]
        --cloud-spot                              Request a spot instance    [boolean]
        --cloud-spot-price                        Maximum spot instance bidding price
                                                  in USD. Defaults to the current spot
                                                  bidding price [number] [default: -1]
        --cloud-startup-script                    Run the provided Base64-encoded
                                                  Linux shell script during the
                                                  instance initialization     [string]
        --cloud-aws-security-group                Specifies the security group in AWS
                                                                [string] [default: \\"\\"]
        --cloud-aws-subnet,                       Specifies the subnet to use within
        --cloud-aws-subnet-id                     AWS           [string] [default: \\"\\"]"
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

  test.skip('cml-runner GH/AWS', async () => {
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
