jest.setTimeout(200000);

const { exec } = require('./utils');

const diff_metrics_fixture = `{"metrics/eval.json": {"accuracy": {"old": "0.8784", "new": "0.8783"}}, "metrics/train.json": {"took": {"old": 0.0015638272762298585, "new": 0.0014997141361236571, "diff": -6.411314010620135e-05}, "num_steps": {"old": 1400, "new": 1200, "diff": -200}}}`;
const diff_fixture = `{"added": [], "deleted": [], "modified": [{"path": "metrics/eval.json"}, {"path": "metrics/train.json"}, {"path": "models/"}]}`;

const VEGA_LITE_FIXTURE = {
  $schema: 'https://vega.github.io/schema/vega-lite/v2.0.json',
  description: 'A simple bar chart with embedded data.',
  data: {
    values: [
      { a: 'A', b: 28 },
      { a: 'B', b: 55 },
      { a: 'C', b: 43 },
      { a: 'D', b: 91 },
      { a: 'E', b: 81 },
      { a: 'F', b: 53 },
      { a: 'G', b: 19 },
      { a: 'H', b: 87 },
      { a: 'I', b: 52 }
    ]
  },
  mark: 'bar',
  encoding: {
    x: { field: 'a', type: 'ordinal' },
    y: { field: 'b', type: 'quantitative' }
  }
};

describe('Gitlab Vega and image', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    delete process.GITHUB_ACTION;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  test.skip('vega2md', async () => {
    const Report = require('./report');
    const uri = await Report.vega2md({ data: VEGA_LITE_FIXTURE });
    console.log(uri);

    expect(typeof uri).toBe('string');
  });
});

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
        --version   Show version number                                      [boolean]
        -h          Show help                                                [boolean]
        --maxchars                                                    [default: 20000]"
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
        --version   Show version number                                      [boolean]
        -h          Show help                                                [boolean]
        --maxchars                                                    [default: 20000]"
    `);
  });

  test('cml-setup-env-remote', async () => {
    const output = await exec(`node ./bin/cml-setup-env-remote.js -h`);

    expect(output).toMatchInlineSnapshot(`""`);
  });

  test('cml-send-comment -h', async () => {
    const output = await exec(`node ./bin/cml-send-comment.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-comment.js <path> --head-sha <string>

      Options:
        --version   Show version number                                      [boolean]
        --head-sha  Commit sha
        -h          Show help                                                [boolean]"
    `);
  });

  test('cml-send-github-check -h', async () => {
    const output = await exec(
      `echo none | node ./bin/cml-send-github-check.js -h`
    );

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-send-github-check.js <path> --head-sha <string>

      Options:
        --version   Show version number                                      [boolean]
        --head-sha  Commit sha
        -h          Show help                                                [boolean]"
    `);
  });

  test('cml-publish -h', async () => {
    const output = await exec(`node ./bin/cml-publish.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-publish.js <path> --file <string>

      Options:
        --version  Show version number                                       [boolean]
        -h         Show help                                                 [boolean]
        --md"
    `);
  });

  test('cml-publish assets/logo.png --md', async () => {
    const output = await exec(
      `node ./bin/cml-publish.js assets/logo.png --md true`
    );

    expect(output.startsWith('![](')).toBe(true);
  });

  test('cml-publish assets/logo.pdf --md', async () => {
    const output = await exec(
      `node ./bin/cml-publish.js assets/logo.pdf --md true --title 'this is awesome'`
    );

    expect(output.startsWith('[this is awesome](')).toBe(true);
  });

  test('cml-publish-vega -h', async () => {
    const output = await exec(`echo none | node ./bin/cml-publish-vega.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-publish-vega.js --vega <json> --file <string>

      Options:
        --version  Show version number                                       [boolean]
        -h         Show help                                                 [boolean]
        --md                                                          [default: false]"
    `);
  });

  test('cml-publish-vega -md', async () => {
    const output = await exec(
      `echo '${JSON.stringify(
        VEGA_LITE_FIXTURE
      )}' | node ./bin/cml-publish-vega.js --md true`
    );

    expect(output.startsWith('![](')).toBe(true);
  });
});
