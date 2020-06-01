jest.setTimeout(200000);

const fs = require('fs');
const { exec } = require('../src/utils');

const diff_metrics_fixture = `{"metrics/eval.json": {"accuracy": {"old": "0.8784", "new": "0.8783"}}, "metrics/train.json": {"took": {"old": 0.0015638272762298585, "new": 0.0014997141361236571, "diff": -6.411314010620135e-05}, "num_steps": {"old": 1400, "new": 1200, "diff": -200}}}`;

describe('CML e2e', () => {
  test('cml-metrics with valid data', async () => {
    const output = await exec(
      `echo '${diff_metrics_fixture}' | node ./bin/cml-metrics.js`
    );

    expect(output).toMatchInlineSnapshot(`
      "
      |path|metric|old|new|diff|
      |----|----|----|----|----|
      |metrics/eval.json|accuracy|0.8784|0.8783|no available|
      |metrics/train.json|took|0.0015638|0.0014997|-0.0000641|
      |metrics/train.json|num_steps|1400|1200|-200|

      "
    `);
    expect(output.endsWith('\n\n')).toBe(true);
  });

  test('cml-metrics with valid data with metrics format 0[.][000]', async () => {
    const output = await exec(
      `echo '${diff_metrics_fixture}' | node ./bin/cml-metrics.js --metrics-format 0[.][000]`
    );

    expect(output).toMatchInlineSnapshot(`
      "
      |path|metric|old|new|diff|
      |----|----|----|----|----|
      |metrics/eval.json|accuracy|0.878|0.878|no available|
      |metrics/train.json|took|0.002|0.001|0|
      |metrics/train.json|num_steps|1400|1200|-200|

      "
    `);
    expect(output.endsWith('\n\n')).toBe(true);
  });

  test('cml-metrics with valid data to file', async () => {
    const file = `cml-metrics-test.md`;
    await exec(
      `echo '${diff_metrics_fixture}' | node ./bin/cml-metrics.js --file ${file}`
    );

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });

  test('cml-metrics without data', async () => {
    const output = await exec(
      `echo 'hello' | grep 'bye' | node ./bin/cml-metrics.js`
    );

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

  test('cml-metrics -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-metrics.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-metrics.js --metrics <json> --file <string>

      Options:
        --version         Show version number                                [boolean]
        -h                Show help                                          [boolean]
        --metrics-format                                    [default: \\"0[.][0000000]\\"]"
    `);
  });
});
