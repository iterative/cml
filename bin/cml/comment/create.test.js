const { exec } = require('../../../src/utils');

describe('Comment integration tests', () => {
  test('cml send-comment --help', async () => {
    const output = await exec('node', './bin/cml.js', 'send-comment', '--help');
    expect(output).toMatchInlineSnapshot(`
      "cml.js send-comment <markdown file>

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
        --help                   Show help                                   [boolean]

      Options:
        --target                    Comment type (\`commit\`, \`pr\`, \`commit/f00bar\`,
                                    \`pr/42\`, \`issue/1337\`),default is automatic (\`pr\`
                                    but fallback to \`commit\`).                [string]
        --watch                     Watch for changes and automatically update the
                                    comment                                  [boolean]
        --publish                   Upload any local images found in the Markdown
                                    report                   [boolean] [default: true]
        --publish-url               Self-hosted image server URL
                                           [string] [default: \\"https://asset.cml.dev\\"]
        --publish-native, --native  Uses driver's native capabilities to upload assets
                                    instead of CML's storage; not available on GitHub
                                                                             [boolean]
        --watermark-title           Hidden comment marker (used for targeting in
                                    subsequent \`cml comment update\`); \\"{workflow}\\" &
                                    \\"{run}\\" are auto-replaced   [string] [default: \\"\\"]"
    `);
  });
});
