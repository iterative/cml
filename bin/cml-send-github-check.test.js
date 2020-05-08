jest.setTimeout(200000);

const { exec } = require('../src/utils');
const fs = require('fs').promises;
const { publish_file } = require('../src/report');

describe('CML e2e', () => {
  test('cml-send-github-check', async () => {
    const path = 'check.md';
    const img = await publish_file({
      path: 'assets/logo.png',
      md: true,
      title: 'logo'
    });
    const pdf = await publish_file({
      path: 'assets/logo.pdf',
      md: true,
      title: 'logo'
    });
    const report = `'##Test Check Report \n ${img} \n ${pdf}'`;

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTION &&
      (await exec(`node ./bin/cml-send-github-check.js ${path}`));
    await fs.unlink(path);
  });

  test('cml-send-github-check -h', async () => {
    const output = await exec(`node ./bin/cml-send-github-check.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-github-check.js <path> --head-sha <string>

      Options:
        --version   Show version number                                      [boolean]
        --head-sha  Commit sha
        -h          Show help                                                [boolean]"
    `);
  });
});
