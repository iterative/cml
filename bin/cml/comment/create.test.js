const { exec } = require('../../../src/utils');

describe('Comment integration tests', () => {
  test('cml send-comment --help', async () => {
    const output = await exec(`node ./bin/cml.js send-comment --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js send-comment <markdown file>

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
        --pr                      Post to an existing PR/MR associated with the
                                  specified commit                           [boolean]
        --commit-sha, --head-sha  Commit SHA linked to this comment
                                                            [string] [default: \\"HEAD\\"]
        --publish                 Upload any local images found in the Markdown report
                                                             [boolean] [default: true]
        --publish-url             Self-hosted image server URL
                                           [string] [default: \\"https://asset.cml.dev\\"]
        --watch                   Watch for changes and automatically update the
                                  comment                                    [boolean]
        --native                  Uses driver's native capabilities to upload assets
                                  instead of CML's storage; not available on GitHub
                                                                             [boolean]
        --rm-watermark            Avoid watermark; CML needs a watermark to be able to
                                  distinguish CML comments from others       [boolean]"
    `);
  });
});
