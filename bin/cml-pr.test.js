jest.setTimeout(200000);

const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-publish -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-pr.js -h`);

    expect(output).toMatchInlineSnapshot();
  });
});
