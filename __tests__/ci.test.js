jest.mock('../src/dvc');

const { git } = require('../src/utils');
const report = require('../src/report');
const dvc = require('../src/dvc');
const ci = require('../src/ci');

describe('Dvc Report', () => {
  beforeEach(() => {
    report.same_warning = jest.fn(report.same_warning);

    git.log = jest.fn(git.log);
    git.revparse = jest.fn(refs => {
      return refs[0] === 'HEAD'
        ? '0000000000000000000000000000000000000000'
        : '1111111111111111111111111111111111111111';
    });
  });

  test("Paramters 'from' and 'to' are different, no warning will be displayed", async () => {
    const dvc_diff = {};
    const dvc_metrics_diff = {};
    const others = { all: [] };
    const from = 'HEAD~1';
    const to = 'HEAD';

    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    await ci.dvc_report({ from, to });

    expect(git.revparse.mock.calls.length).toBe(2);
    expect(report.same_warning.mock.calls.length).toBe(0);
  });

  test('Comparing with itself, warning is displayed', async () => {
    jest.mock('../src/report');
    const dvc_diff = {};
    const dvc_metrics_diff = {};
    const others = { all: [] };
    const from = 'HEAD';
    const to = 'HEAD';

    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    await ci.dvc_report({ from, to });
    expect(git.revparse.mock.calls.length).toBe(2);
    expect(report.same_warning.mock.calls.length).toBe(1);
  });
});
