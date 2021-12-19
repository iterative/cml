const { exec } = require('../../src/utils');

describe('CML e2e', () => {
  test('cml-runner --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js runner --help`);

    expect(output).toMatchInlineSnapshot(`
"cml.js runner

Launch and register a self-hosted runner

Options:
  --help                      Show help                                [boolean]
  --version                   Show version number                      [boolean]
  --log                       Maximum log level
          [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
  --labels                    One or more user-defined labels for this runner
                              (delimited with commas)  [string] [default: \\"cml\\"]
  --idle-timeout              Seconds to wait for jobs before shutting down. Set
                              to -1 to disable timeout   [number] [default: 300]
  --name                      Name displayed in the repository once registered
                                                    [string] [default: cml-{ID}]
  --no-retry                  Do not restart workflow terminated due to instance
                              disposal or GitHub Actions timeout       [boolean]
  --single                    Exit after running a single job          [boolean]
  --reuse                     Don't launch a new runner if an existing one has
                              the same name or overlapping labels      [boolean]
  --driver                    Platform where the repository is hosted. If not
                              specified, it will be inferred from the
                              environment [string] [choices: \\"github\\", \\"gitlab\\"]
  --repo                      Repository to be used for registering the runner.
                              If not specified, it will be inferred from the
                              environment                               [string]
  --token                     Personal access token to register a self-hosted
                              runner on the repository. If not specified, it
                              will be inferred from the environment     [string]
  --cloud                     Cloud to deploy the runner
                         [string] [choices: \\"aws\\", \\"azure\\", \\"gcp\\", \\"kubernetes\\"]
  --cloud-region              Region where the instance is deployed. Choices:
                              [us-east, us-west, eu-west, eu-north]. Also
                              accepts native cloud regions
                                                   [string] [default: \\"us-west\\"]
  --cloud-type                Instance type. Choices: [m, l, xl]. Also supports
                              native types like i.e. t2.micro           [string]
  --cloud-permission-set      Specifies the instance profile in AWS or instance
                              service account in GCP      [string] [default: \\"\\"]
  --cloud-metadata            Key Value pairs to associate cml-runner instance
                              on the provider i.e. tags/labels \\"key=value\\"
                                                           [array] [default: []]
  --cloud-gpu                 GPU type.
                             [string] [choices: \\"nogpu\\", \\"k80\\", \\"v100\\", \\"tesla\\"]
  --cloud-hdd-size            HDD size in GB                            [number]
  --cloud-ssh-private         Custom private RSA SSH key. If not provided an
                              automatically generated throwaway key will be used
                                                                        [string]
  --cloud-spot                Request a spot instance                  [boolean]
  --cloud-spot-price          Maximum spot instance bidding price in USD.
                              Defaults to the current spot bidding price
                                                          [number] [default: -1]
  --cloud-startup-script      Run the provided Base64-encoded Linux shell script
                              during the instance initialization        [string]
  --cloud-aws-security-group  Specifies the security group in AWS
                                                          [string] [default: \\"\\"]
  --cloud-aws-subnet-id       Specifies the subnet to use within AWS
                                                          [string] [default: \\"\\"]"
`);
  });
});
