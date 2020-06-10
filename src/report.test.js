const REPORT = require('../src/report');

const diff_metrics_fixture = `{"metrics/eval.json": {"accuracy": {"old": "0.8784", "new": "0.8783"}}, "metrics/train.json": {"took": {"old": 0.0015638272762298585, "new": 0.0014997141361236571, "diff": -6.411314010620135e-05}, "num_steps": {"old": 1400, "new": 1200, "diff": -200}}}`;
const diff_fixture = `{"added": [], "deleted": [], "modified": [{"path": "metrics/eval.json"}, {"path": "metrics/train.json"}, {"path": "models/"}]}`;

describe('Report tests', () => {
  test('Metrics diff with fixture', async () => {
    const output = REPORT.dvc_metrics_diff_report_md(
      JSON.parse(diff_metrics_fixture)
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

  test('Metrics diff without data  prints no data available', async () => {
    const output = REPORT.dvc_metrics_diff_report_md();

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

  test('Diff with fixture', async () => {
    const output = REPORT.dvc_diff_report_md(JSON.parse(diff_fixture));

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


      </details>
      "
    `);
  });

  test('Diff with max_chars', async () => {
    const output = REPORT.dvc_diff_report_md(
      JSON.parse(diff_fixture),
      REPORT.MAX_CHARS_MESSAGE.length
    );

    expect(output).toMatchInlineSnapshot(`
      "<details>
      <summary>Added: 0</summary>


      :warning: Report excedeed the maximun amount of allowed chars
      </details>
      <details>
      <summary>Modified: 3</summary>


      :warning: Report excedeed the maximun amount of allowed chars
      </details>
      <details>
      <summary>Deleted: 0</summary>


      :warning: Report excedeed the maximun amount of allowed chars
      </details>
      "
    `);

    expect(output.endsWith(`${REPORT.MAX_CHARS_MESSAGE}\n</details>\n`)).toBe(
      true
    );
  });

  test('Diff without data prints no data available', async () => {
    const output = REPORT.dvc_diff_report_md();

    expect(output).toMatchInlineSnapshot(`"No metrics available"`);
  });

  test('Publish image', async () => {
    const path = './assets/logo.png';
    const md = false;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish image md', async () => {
    const path = './assets/logo.png';
    const md = true;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
  });

  test('Publish file md', async () => {
    const path = './assets/logo.pdf';
    const md = true;
    const title = 'my title';

    const output = await REPORT.publish_file({ path, md, title });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
  });

  test('Metrics diff should not swallow additional content', async () => {
    const path = './assets/logo.png';
    const md = true;
    const title = 'my title';

    const metrics = REPORT.dvc_metrics_diff_report_md(
      JSON.parse(diff_metrics_fixture)
    );
    const file = await REPORT.publish_file({ path, md, title });
    const output = `${metrics}${file}`;

    expect(output).toMatchInlineSnapshot(`
      "
      |path|metric|old|new|diff|
      |----|----|----|----|----|
      |metrics/eval.json|accuracy|0.8784|0.8783|no available|
      |metrics/train.json|took|0.0015638|0.0014997|-0.0000641|
      |metrics/train.json|num_steps|1400|1200|-200|

      ![](https://asset.cml.dev/46a67bf4781c440fb13b701a81f0a0e3707ce21b \\"my title\\")"
    `);
  });
});
