jest.setTimeout(200000);

const fs = require('fs');
const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-publish -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-publish.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-publish.js <path> --file <string>

      Options:
        --version         Show version number                                [boolean]
        --md              Output in markdown.                                [boolean]
        --title, -t       If --md sets the title in markdown [title](url) or ![](url
                          title).
        --file, -f        Outputs to the given file.
        --gitlab-uploads  Uses Gitlab's uploads api instead of CML's storage.[boolean]
        -h                Show help                                          [boolean]"
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
    const title = 'this is awesome';
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.pdf --md --title '${title}'`
    );

    expect(output.startsWith(`[${title}](`)).toBe(true);
  });

  test('cml-publish assets/logo.pdf', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/logo.pdf`
    );

    expect(output.startsWith('https://')).toBe(true);
  });

  test('cml-publish assets/test.svg --md', async () => {
    const title = 'this is awesome';
    const output = await exec(
      `echo none | node ./bin/cml-publish.js assets/test.svg --md --title '${title}'`
    );

    expect(output.startsWith('![](') && output.endsWith(`${title}")`)).toBe(
      true
    );
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
      `echo none | node ./bin/cml-publish.js assets/logo.pdf --file ${file}`
    );

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });
});
