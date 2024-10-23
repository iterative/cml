const { exec } = require('../../../src/utils');
const fs = require('fs').promises;

describe('Comment integration tests', () => {
  const path = 'comment.md';

  afterEach(async () => {
    try {
      await fs.unlink(path);
    } catch (err) {}
  });

  test('cml send-comment to specific repo', async () => {
    const {
      TEST_GITHUB_REPOSITORY: repo,
      TEST_GITHUB_TOKEN: token,
      TEST_GITHUB_COMMIT: sha
    } = process.env;

    const report = `## Test Comment Report specific`;

    await fs.writeFile(path, report);
    await exec(
      'node',
      './bin/cml.js',
      'send-comment',
      '--repo',
      repo,
      '--token',
      token,
      '--commit-sha',
      sha,
      path
    );
  });
});
