jest.setTimeout(200000);

const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-setup-env-remote', async () => {
    const output = await exec(`node ./bin/cml-setup-env-remote.js -h`);

    expect(output).toMatchInlineSnapshot(`""`);
  });
});
