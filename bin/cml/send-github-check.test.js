const { exec } = require('../../src/utils');
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

Create a check report

Options:
  --help                    Show help                                  [boolean]
  --version                 Show version number                        [boolean]
  --log                     Maximum log level
                   [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
  --commit-sha, --head-sha  Commit SHA linked to this comment. Defaults to HEAD.
  --title                   Sets title of the check.     [default: \\"CML Report\\"]
  --repo                    Specifies the repo to be used. If not specified is
                            extracted from the CI ENV.
  --token                   Personal access token to be used. If not specified
                            in extracted from ENV REPO_TOKEN.
  --conclusion[choices: \\"success\\", \\"failure\\", \\"neutral\\", \\"cancelled\\", \\"skipped\\",
                \\"timed_out\\"] [default: Sets the conclusion status of the check.]"
`);
  });
});
