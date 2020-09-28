jest.setTimeout(200000);

const { exec } = require('../src/utils');
const fs = require('fs').promises;
const { publish_file } = require('../src/report');

describe('CML e2e', () => {
  test('cml-send-comment', async () => {
    const path = 'comment.md';
    const img = await publish_file({
      path: 'assets/logo.png',
      md: true,
      title: 'logo'
    });

    const report = `## Test Comment Report \n ${img}`;

    await fs.writeFile(path, report);
    await exec(`node ./bin/cml-send-comment.js ${path}`);
    await fs.unlink(path);
  });

  test('cml-send-comment -h', async () => {
    const output = await exec(`node ./bin/cml-send-comment.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-comment.js <path> --head-sha <string>

      Options:
        --version     Show version number                                    [boolean]
        --commit-sha  Commit sha
        --head-sha    Commit sha                  [deprecated: Use commit-sha instead]
        -h            Show help                                              [boolean]"
    `);
  });
});
