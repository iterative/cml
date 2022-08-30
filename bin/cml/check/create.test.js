const { exec } = require('../../../src/utils');
const fs = require('fs').promises;

describe('CML e2e', () => {
  const path = 'check.md';

  afterEach(async () => {
    try {
      await fs.unlink(path);
    } catch (err) {}
  });

  test('cml send-github-check', async () => {
    const report = `## Test Check Report`;

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTIONS &&
      (await exec(`node ./bin/cml.js send-github-check ${path}`));
  });

  test('cml send-github-check failure with tile "CML neutral test"', async () => {
    const report = `## Hi this check should be neutral`;
    const title = 'CML neutral test';
    const conclusion = 'neutral';

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTIONS &&
      (await exec(
        `node ./bin/cml.js send-github-check ${path} --title "${title}" --conclusion "${conclusion}"`
      ));
  });

  test('cml send-github-check --help', async () => {
    const output = await exec(`node ./bin/cml.js send-github-check --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js send-github-check <markdown file>

      Global Options:
        --log     Logging verbosity
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver  Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
        --repo    Repository URL or slug[string] [default: infer from the environment]
        --token   GITHUB_TOKEN or Github App token. Personal access token won't work
                                        [string] [default: infer from the environment]

      Options:
        --help                    Show help                                  [boolean]
        --version                 Show version number                        [boolean]
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
