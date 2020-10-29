// this test might be long
jest.setTimeout(300000);
const { exec } = require('../src/utils');

describe('CML e2e', () => {
  test('cml-cloud-runner -h', async () => {
    const output = await exec('node ./bin/cml-cloud-runner.js -h');

    expect(output).toMatchInlineSnapshot();
  });
});
