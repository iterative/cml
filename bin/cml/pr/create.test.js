const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml-pr --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js pr --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js pr <glob path...>

      Manage pull requests

      Commands:
        cml.js pr create <glob path...>  Create a pull request with the specified
                                         files

      Options:
        --help                 Show help                                     [boolean]
        --version              Show version number                           [boolean]
        --log                  Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver               Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo                 Repository URL or slug
                                        [string] [default: infer from the environment]
        --token                Personal access token
                                        [string] [default: infer from the environment]
        --md                   Output in markdown format [](url)             [boolean]
        --skip-ci              Force skip CI for the created commit (if any) [boolean]
        --merge, --auto-merge  Try to merge the pull request upon creation   [boolean]
        --rebase               Try to rebase-merge the pull request upon creation
                                                                             [boolean]
        --squash               Try to squash-merge the pull request upon creation
                                                                             [boolean]
        --branch               Pull request branch name                       [string]
        --title                Pull request title                             [string]
        --body                 Pull request description                       [string]
        --message              Commit message                                 [string]
        --remote               Git remote                 [string] [default: \\"origin\\"]
        --user-email           Git user email[string] [default: \\"olivaw@iterative.ai\\"]
        --user-name            Git user name         [string] [default: \\"Olivaw[bot]\\"]"
    `);
  });
});
