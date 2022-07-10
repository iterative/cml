const { exec } = require('../src/utils');

describe('command-line interface tests', () => {
  test('cml --help', async () => {
    const output = await exec(`node ./bin/cml.js --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js <command>

      Commands:
        cml.js check              Manage CI checks (status reports)
        cml.js pr <glob path...>  Manage pull requests
        cml.js report             Manage reports
        cml.js repository         Manage repository settings
        cml.js runner             Manage continuous integration self-hosted runners
        cml.js tensorboard        Manage tensorboard.dev agents
        cml.js workflow           Manage CI workflows

      Options:
        --help     Show help                                                 [boolean]
        --version  Show version number                                       [boolean]
        --log      Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver   Forge where the repository is hosted. If not specified, it will be
                   inferred from the environment
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        --repo     Repository. If not specified, it will be inferred from the
                   environment                                                [string]
        --token    Personal access token. If not specified, it will be inferred from
                   the environment                                            [string]"
    `);
  });
});
