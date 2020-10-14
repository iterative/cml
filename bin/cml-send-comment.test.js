jest.setTimeout(200000);

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
        --version     Show version number                                    [boolean]
        --commit-sha  Commit SHA linked to this comment. Defaults to HEAD.
        --head-sha    Commit SHA linked to this comment. Defaults to HEAD
                                                  [deprecated: Use commit-sha instead]
        -h            Show help                                              [boolean]"
    `);
  });

  test('cml-send-comment', async () => {
    const report = `## Test Comment Report`;

    await fs.writeFile(path, report);
    await exec(`node ./bin/cml-send-comment.js ${path}`);
  });
});
