const { exec } = require('../../src/utils');

describe('CML e2e', () => {
  test('cml-ci --help', async () => {
    const output = await exec(
      `echo none | node ./bin/cml.js rerun-workflow --help`
    );

    expect(output).toMatchInlineSnapshot();
  });
});
