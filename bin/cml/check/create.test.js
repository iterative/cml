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

      Options:
        --help                    Show help                                  [boolean]
        --version                 Show version number                        [boolean]
        --log                     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --driver                  Forge where the repository is hosted. If not
                                  specified, it will be inferred from the environment
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        --repo                    Repository. If not specified, it will be inferred
                                  from the environment                        [string]
        --token                   Personal access token. If not specified, it will be
                                  inferred from the environment               [string]
        --commit-sha, --head-sha  Commit SHA linked to this comment. Defaults to HEAD.
                                                                              [string]
        --conclusion              Sets the conclusion status of the check.
           [string] [choices: \\"success\\", \\"failure\\", \\"neutral\\", \\"cancelled\\", \\"skipped\\",
                                                     \\"timed_out\\"] [default: \\"success\\"]
        --status                  Sets the status of the check.
                    [string] [choices: \\"queued\\", \\"in_progress\\", \\"completed\\"] [default:
                                                                          \\"completed\\"]
        --title                   Sets title of the check.
                                                      [string] [default: \\"CML Report\\"]"
    `);
  });
});
