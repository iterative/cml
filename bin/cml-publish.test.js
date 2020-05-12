jest.setTimeout(200000);

const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-publish -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-publish.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-publish.js <path>

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
});
