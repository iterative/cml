const { exec } = require('../../src/utils');

describe('CML e2e', () => {
  test('cml-pr --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js pr --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js pr <glob path...>

      Create a pull request with the specified files

      Options:
        --help                 Show help                                     [boolean]
        --version              Show version number                           [boolean]
        --log                  Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver               Platform where the repository is hosted. If not
                               specified, it will be inferred from the environment
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        --repo                 Repository to be used for registering the runner. If
                               not specified, it will be inferred from the environment
                                                                              [string]
        --token                Personal access token to register a self-hosted runner
                               on the repository. If not specified, it will be
                               inferred from the environment                  [string]
        --md                   Output in markdown format [](url).            [boolean]
        --skip-ci              Force skip CI for the created commit (if any) [boolean]
        --merge, --auto-merge  Try to merge the pull request upon creation.  [boolean]
        --rebase               Try to rebase-merge the pull request upon creation.
                                                                             [boolean]
        --squash               Try to squash-merge the pull request upon creation.
                                                                             [boolean]
        --remote               Sets git remote.           [string] [default: \\"origin\\"]
        --user-email           Sets git user email.
                                             [string] [default: \\"olivaw@iterative.ai\\"]
        --user-name            Sets git user name.   [string] [default: \\"Olivaw[bot]\\"]"
    `);
  });
});
