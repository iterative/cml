const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml send-github-check --help', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'send-github-check',
      '--help'
    );

    expect(output).toMatchInlineSnapshot(`
      "cml.js send-github-check <markdown file>

      Global Options:
        --log                    Logging verbosity
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver                 Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo                   Repository URL or slug
                                        [string] [default: infer from the environment]
        --driver-token, --token  GITHUB_TOKEN or Github App token. Personal access
                                 token won't work
                                        [string] [default: infer from the environment]
        --help                   Show help                                   [boolean]

      Options:
        --commit-sha, --head-sha  Commit SHA linked to this comment
                                                              [string] [default: HEAD]
        --conclusion              Conclusion status of the check
           [string] [choices: \\"success\\", \\"failure\\", \\"neutral\\", \\"cancelled\\", \\"skipped\\",
                                                     \\"timed_out\\"] [default: \\"success\\"]
        --status                  Status of the check
                    [string] [choices: \\"queued\\", \\"in_progress\\", \\"completed\\"] [default:
                                                                          \\"completed\\"]
        --title                   Title of the check  [string] [default: \\"CML Report\\"]"
    `);
  });
});
