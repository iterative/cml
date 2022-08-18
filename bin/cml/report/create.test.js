const { exec } = require('../../../src/utils');
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

      Options:
        --help                    Show help                                  [boolean]
        --version                 Show version number                        [boolean]
        --log                     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --repo                    Specifies the repo to be used. If not specified is
                                  extracted from the CI ENV.                  [string]
        --token                   Personal access token to be used. If not specified
                                  is extracted from ENV REPO_TOKEN.           [string]
        --driver                  If not specify it infers it from the ENV.
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        --pr                      Post to an existing PR/MR associated with the
                                  specified commit                           [boolean]
        --commit-sha, --head-sha  Commit SHA linked to this comment
                                                            [string] [default: \\"HEAD\\"]
        --publish                 Upload local files and images linked from the
                                  Markdown report                            [boolean]
        --watch                   Watch for changes and automatically update the
                                  report                                     [boolean]
        --native                  Uses driver's native capabilities to upload assets
                                  instead of CML's storage. Not available on GitHub.
                                                                             [boolean]
        --update                  Update the last CML comment (if any) instead of
                                  creating a new one                         [boolean]
        --rm-watermark            Avoid watermark. CML needs a watermark to be able to
                                  distinguish CML reports from other comments in order
                                  to provide extra functionality.            [boolean]"
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
