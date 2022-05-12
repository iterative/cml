const { exec } = require('../../src/utils');
const fs = require('fs').promises;

describe('Comment integration tests', () => {
  const path = 'comment.md';

  afterEach(async () => {
    try {
      await fs.unlink(path);
    } catch (err) {}
  });

  test('cml send-comment --help', async () => {
    const output = await exec(`node ./bin/cml.js send-comment --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js send-comment <markdown file>

      Comment on a commit

      Options:
        --help                    Show help                                  [boolean]
        --version                 Show version number                        [boolean]
        --log                     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --pr                      Post to an existing PR/MR associated with the
                                  specified commit                           [boolean]
        --commit-sha, --head-sha  Commit SHA linked to this comment
                                                            [string] [default: \\"HEAD\\"]
        --update                  Update the last CML comment (if any) instead of
                                  creating a new one                         [boolean]
        --rm-watermark            Avoid watermark. CML needs a watermark to be able to
                                  distinguish CML reports from other comments in order
                                  to provide extra functionality.            [boolean]
        --repo                    Specifies the repo to be used. If not specified is
                                  extracted from the CI ENV.                  [string]
        --token                   Personal access token to be used. If not specified
                                  is extracted from ENV REPO_TOKEN.           [string]
        --driver                  If not specify it infers it from the ENV.
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]"
    `);
  });

  test('cml send-comment to specific repo', async () => {
    const {
      TEST_GITHUB_REPO: repo,
      TEST_GITHUB_TOKEN: token,
      TEST_GITHUB_SHA: sha
    } = process.env;

    const report = `## Test Comment Report specific`;

    await fs.writeFile(path, report);
    await exec(
      `node ./bin/cml.js send-comment --repo=${repo} --token=${token} --commit-sha=${sha} ${path}`
    );
  });

  test('cml send-comment to current repo', async () => {
    const report = `## Test Comment`;

    await fs.writeFile(path, report);
    await exec(`node ./bin/cml.js send-comment ${path}`);
  });
});
