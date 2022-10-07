const { exec } = require('../src/utils');

describe('command-line interface tests', () => {
  test('cml --help', async () => {
    const output = await exec(`node ./bin/cml.js --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js <command>

      Commands:
        cml.js check        Manage CI checks
        cml.js comment      Manage comments
        cml.js pr           Manage pull requests
        cml.js runner       Manage self-hosted (cloud & on-premise) CI runners
        cml.js tensorboard  Manage tensorboard.dev connections
        cml.js workflow     Manage CI workflows
        cml.js ci           Prepare Git repository for CML operations

      Global Options:
        --log     Logging verbosity
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver  Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo    Repository URL or slug[string] [default: infer from the environment]
        --token   Personal access token [string] [default: infer from the environment]
        --help    Show help                                                  [boolean]

      Options:
        --version  Show version number                                       [boolean]"
    `);
  });
});
