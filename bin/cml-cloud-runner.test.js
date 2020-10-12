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
        --repo             Repository to register with. Tries to guess from workflow
                           env variables.
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
        -h                 Show help                                         [boolean]"
    `);
  });

  test('cml-cloud-runner starts a machine', async () => {
    const { AWS_SECRET_ACCESS_KEY, AWS_ACCESS_KEY_ID } = process.env;

    if (AWS_SECRET_ACCESS_KEY && AWS_ACCESS_KEY_ID) {
      const output = await exec(`node ./bin/cml-cloud-runner.js --attached \
        --labels=tf \
        --region us-west-1 \
        --idle-timeout=20`);

      console.error(output);

      const regex = /Destroy complete! Resources: \d destroyed/g;
      const found = output.match(regex);

      try {
        await exec('terraform destroy --auto-approve .cml');
      } catch (err) {
        console.error(process.env);
        throw new Error('Machine was not disposed');
      }

      expect(found).not.toBeUndefined();
    }
  });
});
