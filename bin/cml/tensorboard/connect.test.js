const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml tensorboard-dev --help', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'tensorboard-dev',
      '--help'
    );

    expect(output).toMatchInlineSnapshot(`
      "cml.js tensorboard-dev

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
            --help                   Show help                               [boolean]

      Options:
        -c, --credentials  TensorBoard credentials as JSON, usually found at
                           ~/.config/tensorboard/credentials/uploader-creds.json
                                                                   [string] [required]
            --logdir       Directory containing the logs to process           [string]
            --name         Tensorboard experiment title; max 100 characters   [string]
            --description  Tensorboard experiment description in Markdown format; max
                           600 characters                                     [string]
            --md           Output as markdown [title || name](url)           [boolean]
        -t, --title        Markdown title, if not specified, param name will be used
                                                                              [string]"
    `);
  });
});
