jest.mock('./dvc');

const { git } = require('./utils');
const report = require('./report');
const dvc = require('./dvc');

describe('Dvc Report no data', () => {
  const ci = require('./ci');

  let dvc_diff;
  let dvc_metrics_diff;
  let others;
  let from;
  let to;

  beforeEach(() => {
    report.no_tag_warning = jest.fn(report.no_tag_warning);
    report.same_warning = jest.fn(report.same_warning);

    git.log = jest.fn(git.log);
    git.revparse = jest.fn(refs => {
      return refs[0] === 'HEAD'
        ? '0000000000000000000000000000000000000000'
        : '1111111111111111111111111111111111111111';
    });

    dvc_diff = {};
    dvc_metrics_diff = {};
    others = { all: [] };
    from = 'HEAD~1';
    to = 'HEAD';
  });

  test('Different from to: No warning header', async () => {
    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    const dvc_report = await ci.dvc_report({ from, to });

    expect(git.revparse.mock.calls.length).toBe(2);
    expect(report.same_warning.mock.calls.length).toBe(0);
    expect(dvc_report.md).toMatchInlineSnapshot(`
      "### Baseline: HEAD~1 ( 1111111 vs 0000000 ) 
       

      #### Metrics 

       No metrics available 

      #### Data 

      No metrics available 

      #### Other experiments 
      No other experiments available"
    `);
    expect(dvc_report.html).toMatchInlineSnapshot(`
      "
      <!doctype html>
      <html>
      	<head>
      		<meta charset=\\"utf-8\\">
      		<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1, minimal-ui\\">
      		<title>DVC Report</title>
      		<link rel=\\"stylesheet\\" href=\\"report.css\\">
      		<style>
      			body {
      				box-sizing: border-box;
      				min-width: 200px;
      				max-width: 980px;
      				margin: 0 auto;
      				padding: 45px;
      			}
      		</style>
      	</head>
      	<body>
            <div class=\\"markdown-body\\" id=\\"content\\">
              <h3 id=\\"baseline-head1--1111111-vs-0000000-\\">Baseline: HEAD~1 ( 1111111 vs 0000000 )</h3>
      <h4 id=\\"metrics\\">Metrics</h4>
      <p>No metrics available </p>
      <h4 id=\\"data\\">Data</h4>
      <p>No metrics available </p>
      <h4 id=\\"other-experiments\\">Other experiments</h4>
      <p>No other experiments available</p>
            </div>
        </body>
      </html>
      "
    `);
  });

  test('Same from to: Displays warning header', async () => {
    from = 'HEAD';
    to = 'HEAD';

    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    const dvc_report = await ci.dvc_report({ from, to });

    expect(git.revparse.mock.calls.length).toBe(2);
    expect(report.same_warning.mock.calls.length).toBe(1);
    expect(dvc_report.md).toMatchInlineSnapshot(`
      "### Baseline: HEAD ( 0000000 vs 0000000 ) 
      >:warning: You are comparing ref HEAD with itself, no diff available. 
      Please [setup rev environment variable](https://github.com/iterative/dvc-cml#env-variables) accordingly 

      #### Metrics 

       No metrics available 

      #### Data 

      No metrics available 

      #### Other experiments 
      No other experiments available"
    `);
    expect(dvc_report.html).toMatchInlineSnapshot(`
      "
      <!doctype html>
      <html>
      	<head>
      		<meta charset=\\"utf-8\\">
      		<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1, minimal-ui\\">
      		<title>DVC Report</title>
      		<link rel=\\"stylesheet\\" href=\\"report.css\\">
      		<style>
      			body {
      				box-sizing: border-box;
      				min-width: 200px;
      				max-width: 980px;
      				margin: 0 auto;
      				padding: 45px;
      			}
      		</style>
      	</head>
      	<body>
            <div class=\\"markdown-body\\" id=\\"content\\">
              <h3 id=\\"baseline-head--0000000-vs-0000000-\\">Baseline: HEAD ( 0000000 vs 0000000 )</h3>
      <blockquote>
        <p>⚠️ You are comparing ref HEAD with itself, no diff available. <br />
        Please <a href=\\"https://github.com/iterative/dvc-cml#env-variables\\">setup rev environment variable</a> accordingly </p>
      </blockquote>
      <h4 id=\\"metrics\\">Metrics</h4>
      <p>No metrics available </p>
      <h4 id=\\"data\\">Data</h4>
      <p>No metrics available </p>
      <h4 id=\\"other-experiments\\">Other experiments</h4>
      <p>No other experiments available</p>
            </div>
        </body>
      </html>
      "
    `);
  });

  test('Set tag prefix wont show warning', async () => {
    ci.DVC_TAG_PREFIX = 'dvc_';

    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    const dvc_report = await ci.dvc_report({ from, to });

    expect(report.no_tag_warning.mock.calls.length).toBe(0);
    expect(dvc_report.md).toMatchInlineSnapshot(`
      "### Baseline: HEAD~1 ( 1111111 vs 0000000 ) 
       

      #### Metrics 

       No metrics available 

      #### Data 

      No metrics available 

      #### Other experiments 
      No other experiments available"
    `);
    expect(dvc_report.html).toMatchInlineSnapshot(`
      "
      <!doctype html>
      <html>
      	<head>
      		<meta charset=\\"utf-8\\">
      		<meta name=\\"viewport\\" content=\\"width=device-width, initial-scale=1, minimal-ui\\">
      		<title>DVC Report</title>
      		<link rel=\\"stylesheet\\" href=\\"report.css\\">
      		<style>
      			body {
      				box-sizing: border-box;
      				min-width: 200px;
      				max-width: 980px;
      				margin: 0 auto;
      				padding: 45px;
      			}
      		</style>
      	</head>
      	<body>
            <div class=\\"markdown-body\\" id=\\"content\\">
              <h3 id=\\"baseline-head1--1111111-vs-0000000-\\">Baseline: HEAD~1 ( 1111111 vs 0000000 )</h3>
      <h4 id=\\"metrics\\">Metrics</h4>
      <p>No metrics available </p>
      <h4 id=\\"data\\">Data</h4>
      <p>No metrics available </p>
      <h4 id=\\"other-experiments\\">Other experiments</h4>
      <p>No other experiments available</p>
            </div>
        </body>
      </html>
      "
    `);
  });
});
