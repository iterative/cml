// this test might be long
jest.setTimeout(300000);
const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-cloud-runner -h', async () => {
    const output = await exec('node ./bin/cml-cloud-runner.js -h');

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-cloud-runner.js

      Options:
        --version          Show version number                               [boolean]
        --repo-token       Repository token. Defaults to workflow env variable
                           repo_token.
        --repo             Specifies the repo to be used. If not specified is
                           extracted from the CI ENV.
        --labels           Comma delimited runner labels. Defaults to cml
        --idle-timeout     Time in seconds for the runner to be waiting for jobs
                           before shutting down. Defaults to 5 min
        --image            Docker image. Defaults to dvcorg/cml:latest
        --name             Name displayed in the repo once registered.
        --region           Region where the instance is deployed. Defaults to
                           us-east-1.
        --type             Instance type. Defaults to t2.micro.
        --hdd-size         HDD size in GB. Defaults to 100. Minimum is 100.
        --tf-file          Use a tf file configuration ignoring region, type and
                           hdd_size.
        --rsa-private-key  Your private RSA SHH key. If not provided will be generated
                           by the tf provider.                           [default: \\"\\"]
        --attached         Runs the runner in the foreground.                [boolean]
        --token            Personal access token to be used. If not specified in
                           extracted from ENV repo_token or GITLAB_TOKEN.
        --driver           If not specify it infers it from the ENV.
                                                         [choices: \\"github\\", \\"gitlab\\"]
        -h                 Show help                                         [boolean]"
    `);
  });
});
