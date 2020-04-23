jest.mock('./dvc');
jest.setTimeout(200000);

const { exec } = require('./utils');

const diff_metrics_fixture = `{"metrics/eval.json": {"accuracy": {"old": "0.8784", "new": "0.8783"}}, "metrics/train.json": {"took": {"old": 0.0015638272762298585, "new": 0.0014997141361236571, "diff": -6.411314010620135e-05}, "num_steps": {"old": 1400, "new": 1200, "diff": -200}}}`;
const diff_fixture = `{"added": [], "deleted": [], "modified": [{"path": "metrics/eval.json"}, {"path": "metrics/train.json"}, {"path": "models/"}]}`;

describe('CML e2e', () => {
  test('cml-metrics with valid data', async () => {
    const output = await exec(
      `echo '${diff_metrics_fixture}' | node ./bin/cml-metrics.js`
    );

    expect(output).toMatchInlineSnapshot(`
      "|path|metric|old|new|diff|
      |----|----|----|----|----|
      |metrics/eval.json|accuracy|0.8784|0.8783|no available|
      |metrics/train.json|took|0.0015638|0.0014997|-0.0000641|
      |metrics/train.json|num_steps|1400|1200|-200|"
    `);
  });

  test('cml-metrics without data', async () => {
    const output = await exec(
      `echo 'hello' | grep 'bye' | node ./bin/cml-metrics.js`
    );

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

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


      </details>"
    `);
  });

  test('cml-files without data', async () => {
    const output = await exec(
      `echo 'hello' | grep 'bye' | node ./bin/cml-files.js`
    );

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });
});
