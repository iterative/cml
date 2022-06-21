const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml-ci --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js ci --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js ci

      Options:
        --help        Show help                                              [boolean]
        --version     Show version number                                    [boolean]
        --log         Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver      Forge where the repository is hosted. If not specified, it will
                      be inferred from the environment
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        --repo        Repository. If not specified, it will be inferred from the
                      environment                                             [string]
        --token       Personal access token. If not specified, it will be inferred
                      from the environment                                    [string]
        --unshallow   Fetch as much as possible, converting a shallow repository to a
                      complete one.                                          [boolean]
        --user-email  Set Git user email.    [string] [default: \\"olivaw@iterative.ai\\"]
        --user-name   Set Git user name.             [string] [default: \\"Olivaw[bot]\\"]"
    `);
  });
});
