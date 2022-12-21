const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml-ci --help', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'rerun-workflow',
      '--help'
    );

    expect(output).toMatchInlineSnapshot(`
      "cml.js rerun-workflow

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
        --id  Run identifier to be rerun                                      [string]"
    `);
  });
});
