const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml-pr --help', async () => {
    const output = await exec('node', './bin/cml.js', 'pr', '--help');

    expect(output).toMatchInlineSnapshot(`
      "cml.js pr <glob path...>

      Manage pull requests

      Commands:
        cml.js pr create [glob path...]  Create a pull request (committing any given
                                         paths first)
                                         https://cml.dev/doc/ref/pr

      Global Options:
        --log                    Logging verbosity
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver                 Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo                   Repository URL or slug
                                        [string] [default: infer from the environment]
        --driver-token, --token  CI driver personal/project access token (PAT)
                                        [string] [default: infer from the environment]
        --help                   Show help                                   [boolean]"
    `);
  });
});
