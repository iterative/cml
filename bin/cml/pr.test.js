const { exec } = require('../../src/utils');

describe('CML e2e', () => {
  test('cml-pr --help', async () => {
    const output = await exec(`echo none | node ./bin/cml.js pr --help`);

    expect(output).toMatchInlineSnapshot(`
"cml.js pr <glob path...>

Create a pull request with the specified files

Options:
  --help        Show help                                              [boolean]
  --version     Show version number                                    [boolean]
  --log         Maximum log level
                   [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
  --md          Output in markdown format [](url).                     [boolean]
  --remote      Sets git remote.                             [default: \\"origin\\"]
  --user-email  Sets git user email.            [default: \\"olivaw@iterative.ai\\"]
  --user-name   Sets git user name.                     [default: \\"Olivaw[bot]\\"]
  --repo        Specifies the repo to be used. If not specified is extracted
                from the CI ENV.
  --token       Personal access token to be used. If not specified in extracted
                from ENV REPO_TOKEN.
  --driver      If not specify it infers it from the ENV.
                                                   [choices: \\"github\\", \\"gitlab\\"]"
`);
  });
});
