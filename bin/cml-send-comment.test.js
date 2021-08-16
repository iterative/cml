const { exec } = require('../src/utils');
const fs = require('fs').promises;

describe('Comment integration tests', () => {
  const path = 'comment.md';

  afterEach(async () => {
    try {
      await fs.unlink(path);
    } catch (err) {}
  });

  test('cml-send-comment -h', async () => {
    const output = await exec(`node ./bin/cml-send-comment.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-comment.js <path to markdown file>

      Options:
        --version                 Show version number                        [boolean]
        --commit-sha, --head-sha  Commit SHA linked to this comment. Defaults to HEAD.
        --update                  Update the last CML comment (if any) instead of
                                  creating a new one                         [boolean]
        --rm-watermark            Avoid watermark. CML needs a watermark to be able to
                                  distinguish CML reports from other comments in order
                                  to provide extra functionality.            [boolean]
        --repo                    Specifies the repo to be used. If not specified is
                                  extracted from the CI ENV.
        --token                   Personal access token to be used. If not specified
                                  is extracted from ENV REPO_TOKEN.
        --driver                  If not specify it infers it from the ENV.
                                            [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]
        -h                        Show help                                  [boolean]"
    `);
  });

  test('cml-send-comment to specific repo', async () => {
    const {
      TEST_GITHUB_REPO: repo,
      TEST_GITHUB_TOKEN: token,
      TEST_GITHUB_SHA: sha
    } = process.env;

    const report = `## Test Comment Report specific`;

    await fs.writeFile(path, report);
    await exec(
      `node ./bin/cml-send-comment.js --repo=${repo} --token=${token} --commit-sha=${sha} ${path}`
    );
  });

  test('cml-send-comment to current repo', async () => {
    const report = `## Test Comment`;

    await fs.writeFile(path, report);
    await exec(`node ./bin/cml-send-comment.js ${path}`);
  });
});
