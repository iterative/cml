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
      (await exec('node', './bin/cml.js', 'send-github-check', path));
  });

  test('cml send-github-check failure with tile "CML neutral test"', async () => {
    const report = `## Hi this check should be neutral`;
    const title = 'CML neutral test';
    const conclusion = 'neutral';

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTIONS &&
      (await exec(
        'node',
        './bin/cml.js',
        'send-github-check',
        path,
        '--title',
        title,
        '--conclusion',
        conclusion
      ));
  });
});
