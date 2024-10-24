const fs = require('fs');
const { exec } = require('../../../src/utils');

describe('CML e2e', () => {
  test('cml publish assets/logo.png --md', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/logo.png',
      '--md'
    );

    expect(output.startsWith('![](')).toBe(true);
  });

  test('cml publish assets/logo.png', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/logo.png'
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml publish assets/logo.pdf --md', async () => {
    const title = 'this is awesome';
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/logo.pdf',
      '--md',
      '--title',
      title
    );

    expect(output.startsWith(`[${title}](`)).toBe(true);
  });

  test('cml publish assets/logo.pdf', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/logo.pdf'
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml publish assets/test.svg --md', async () => {
    const title = 'this is awesome';
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/test.svg',
      '--md',
      '--title',
      title
    );

    expect(output.startsWith('![](') && output.endsWith(`${title}")`)).toBe(
      true
    );
  });

  test('cml publish assets/test.svg', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/test.svg'
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml publish assets/logo.pdf to file', async () => {
    const file = `cml-publish-test.md`;

    await exec(
      'node',
      './bin/cml.js',
      'publish',
      'assets/logo.pdf',
      '--file',
      file
    );

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });

  test('cml publish assets/vega-lite.json', async () => {
    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      '--mime-type',
      'application/json',
      'assets/vega-lite.json'
    );

    expect(output.startsWith('https://')).toBe(true);
    expect(output.includes('cml=json')).toBe(true);
  });

  test('cml publish assets/test.svg in Gitlab storage', async () => {
    const { TEST_GITLAB_REPOSITORY: repo, TEST_GITLAB_TOKEN: token } =
      process.env;

    const output = await exec(
      'node',
      './bin/cml.js',
      'publish',
      '--repo',
      repo,
      '--token',
      token,
      '--gitlab-uploads',
      'assets/test.svg'
    );

    expect(output.startsWith('/uploads/')).toBe(true);
  });

  test('cml publish /nonexistent produces file error', async () => {
    await expect(
      exec('node', './bin/cml.js', 'publish', '/nonexistent')
    ).rejects.toThrowError('ENOENT');
  });
});
