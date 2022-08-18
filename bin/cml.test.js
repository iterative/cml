const { exec } = require('../src/utils');

describe('command-line interface tests', () => {
  test('cml --help', async () => {
    const output = await exec(`node ./bin/cml.js --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js <command>

      Commands:
        cml.js check              Manage CI checks
        cml.js pr <glob path...>  Manage pull requests
        cml.js report             Manage reports
        cml.js repository         Manage repository settings
        cml.js runner             Manage self-hosted (cloud & on-premise) CI runners
        cml.js tensorboard        Manage tensorboard.dev agents
        cml.js workflow           Manage continuous integration workflows

      Options:
        --help     Show help                                                 [boolean]
        --version  Show version number                                       [boolean]
        --log      Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver   Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo     Repository URL or slug
                                        [string] [default: infer from the environment]
        --token    Personal access token[string] [default: infer from the environment]"
    `);
  });
});
