jest.setTimeout(200000);

const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-publish -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-pr.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-pr.js <path to markdown file>

      Options:
        --version  Show version number                                       [boolean]
        --md       Output in markdown format [](url).                        [boolean]
        --repo     Specifies the repo to be used. If not specified is extracted from
                   the CI ENV.
        --token    Personal access token to be used. If not specified in extracted
                   from ENV repo_token.
        --driver   If not specify it infers it from the ENV.
                                                         [choices: \\"github\\", \\"gitlab\\"]
        -h         Show help                                                 [boolean]"
    `);
  });
});
