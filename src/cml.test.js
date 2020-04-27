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

  test('cml-metrics with valid data with metrics format 0[.][000]', async () => {
    const output = await exec(
      `echo '${diff_metrics_fixture}' | node ./bin/cml-metrics.js --metrics_format 0[.][000]`
    );

    expect(output).toMatchInlineSnapshot(`
      "|path|metric|old|new|diff|
      |----|----|----|----|----|
      |metrics/eval.json|accuracy|0.878|0.878|no available|
      |metrics/train.json|took|0.002|0.001|0|
      |metrics/train.json|num_steps|1400|1200|-200|"
    `);
  });

  test('cml-metrics without data', async () => {
    const output = await exec(
      `echo 'hello' | grep 'bye' | node ./bin/cml-metrics.js`
    );

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

  test('cml-metrics -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-files.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-files.js --metrics <json> --file <string>

      Options:
        --version      Show version number                                   [boolean]
        -h             Show help                                             [boolean]
        --maxchars                                                    [default: 20000]
        -m, --metrics                                                [default: \\"none\\"]
        -f, --file"
    `);
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

  test('cml-files -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-files.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-files.js --metrics <json> --file <string>

      Options:
        --version      Show version number                                   [boolean]
        -h             Show help                                             [boolean]
        --maxchars                                                    [default: 20000]
        -m, --metrics                                                [default: \\"none\\"]
        -f, --file"
    `);
  });

  test('cml-setup-env-remote', async () => {
    const output = await exec(`node ./bin/cml-setup-env-remote.js -h`);

    expect(output).toMatchInlineSnapshot(`""`);
  });

  test('cml-send-comment -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-send-comment.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-comment.js --path <string>

      Options:
        --version   Show version number                                      [boolean]
        -h          Show help                                                [boolean]
        -p, --path                                                          [required]
        --head_sha"
    `);
  });

  test('cml-send-github-check -h', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-send-github-check.js -h`
    );

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-github-check.js --path <string>

      Options:
        --version   Show version number                                      [boolean]
        -h          Show help                                                [boolean]
        -p, --path                                                          [required]
        --head_sha"
    `);
  });
});
