jest.setTimeout(200000);

const fs = require('fs');
const { exec } = require('../src/utils');

const diff_fixture = `{"added": [], "deleted": [], "modified": [{"path": "metrics/eval.json"}, {"path": "metrics/train.json"}, {"path": "models/"}]}`;

describe('CML e2e', () => {
  test('cml-files with valid data', async () => {
    const output = await exec(
      `echo '${diff_fixture}' | node ./bin/cml-files.js`
    );

    expect(output).toMatchInlineSnapshot(`
      "<details>
      <summary>Added: 0</summary>


      </details>
      <details>
      <summary>Modified: 3</summary>

       - metrics/eval.json 
       - metrics/train.json 
       - models/ 

      </details>
      <details>
      <summary>Deleted: 0</summary>


      </details>
      "
    `);
  });

  test('cml-files with valid data to file', async () => {
    const file = `cml-files-test.md`;
    await exec(
      `echo '${diff_fixture}' | node ./bin/cml-files.js --file ${file}`
    );

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });

  test('cml-files without data', async () => {
    const output = await exec(
      `echo 'hello' | grep 'bye' | node ./bin/cml-files.js`
    );

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

  test('cml-files -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-files.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-files.js --metrics <json> --file <string>

      Options:
        --version   Show version number                                      [boolean]
        -h          Show help                                                [boolean]
        --maxchars                                                    [default: 20000]"
    `);
  });
});
