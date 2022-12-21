const { exec } = require('../../../src/utils');

describe('CML cli test', () => {
  test('cml publish --help', async () => {
    const output = await exec('node', './bin/cml.js', 'publish', '--help');

    expect(output).toMatchInlineSnapshot(`
      "cml.js publish <asset>

      Global Options:
            --log                    Logging verbosity
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
            --driver                 Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
            --repo                   Specifies the repo to be used. If not specified
                                     is extracted from the CI ENV.
                                        [string] [default: infer from the environment]
            --driver-token, --token  CI driver personal/project access token (PAT)
                                        [string] [default: infer from the environment]
            --help                   Show help                               [boolean]

      Options:
            --md         Output in markdown format [title || name](url)      [boolean]
        -t, --title      Markdown title [title](url) or ![](url title)        [string]
            --native     Uses driver's native capabilities to upload assets instead of
                         CML's storage; not available on GitHub              [boolean]
            --mime-type  MIME type    [string] [default: infer from the file contents]"
    `);
  });
});
