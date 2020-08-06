jest.setTimeout(200000);

const fs = require('fs');
const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-publish -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-publish.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-publish.js <path> --file <string>

      Options:
        --version  Show version number                                       [boolean]
        -h         Show help                                                 [boolean]"
    `);
  });

  test('cml-publish assets/logo.png --md', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.png --md`
    );

    expect(output.startsWith('![](')).toBe(true);
  });

  test('cml-publish assets/logo.png', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.png`
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml-publish assets/logo.pdf --md', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.pdf --md --title 'this is awesome'`
    );

    expect(output.startsWith('[this is awesome](')).toBe(true);
  });

  test('cml-publish assets/logo.pdf', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.pdf --title 'this is awesome'`
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml-publish assets/test.svg --md', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/test.svg --md --title 'this is awesome'`
    );

    expect(output.startsWith('![](')).toBe(true);
  });

  test('cml-publish assets/test.svg', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/test.svg`
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml-publish assets/logo.pdf to file', async () => {
    const file = `cml-publish-test.md`;

    await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.pdf --title 'this is awesome' --file ${file}`
    );

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });
});
