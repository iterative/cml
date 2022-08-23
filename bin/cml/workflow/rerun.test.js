const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml-ci --help', async () => {
    const output = await exec(
      `echo none | node ./bin/cml.js rerun-workflow --help`
    );

    expect(output).toMatchInlineSnapshot(`
      "cml.js rerun-workflow

      Global Options:
        --log     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver  Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo    Repository URL or slug[string] [default: infer from the environment]
        --token   Personal access token [string] [default: infer from the environment]

      Options:
        --help     Show help                                                 [boolean]
        --version  Show version number                                       [boolean]
        --id       Run identifier to be rerun                                 [string]"
    `);
  });
});
