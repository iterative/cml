jest.setTimeout(200000);

const { exec } = require('../src/utils');
const fs = require('fs').promises;

describe('CML e2e', () => {
  const path = 'check.md';

  afterEach(async () => {
    try {
      await fs.unlink(path);
    } catch (err) {}
  });

  test('cml-send-github-check', async () => {
    const report = `## Test Check Report failure`;
    const title = 'CML failure test';
    const conclusion = 'failure';

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTIONS &&
      (await exec(
        `node ./bin/cml-send-github-check.js ${path} --title "${title}" --conclusion "${conclusion}"`
      ));
  });

  test('cml-send-github-check failure with tile "CML neutral test"', async () => {
    const report = `## Hi this check should be neutral ksjdkjsksdjksdjskdjs`;
    const title = 'CML neutral test neutral';
    const conclusion = 'neutral';

    await fs.writeFile(path, report);
    process.env.GITHUB_ACTIONS &&
      (await exec(
        `node ./bin/cml-send-github-check.js ${path} --title "${title}" --conclusion "${conclusion}"`
      ));
  });

  test('cml-send-github-check -h', async () => {
    const output = await exec(`node ./bin/cml-send-github-check.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-github-check.js <path to markdown file>

      Options:
        --version     Show version number                                    [boolean]
        --head-sha    Commit sha where the comment will appear. Defaults to HEAD.
        --title       Sets title of the check.                 [default: \\"CML Report\\"]
        -h            Show help                                              [boolean]
        --conclusion[choices: \\"success\\", \\"failure\\", \\"neutral\\", \\"cancelled\\", \\"skipped\\",
                      \\"timed_out\\"] [default: Sets the conclusion status of the check.]"
    `);
  });
});
