jest.mock('../src/dvc');

const { git } = require('../src/utils');
const report = require('../src/report');
const dvc = require('../src/dvc');

describe('Dvc Report no data', () => {
  const ci = require('../src/ci');

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
    expect(dvc_report.md).toMatchSnapshot();
    expect(dvc_report.html).toMatchSnapshot();
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
    expect(dvc_report.md).toMatchSnapshot();
    expect(dvc_report.html).toMatchSnapshot();
  });

  test('Set tag prefix wont show warning', async () => {
    ci.DVC_TAG_PREFIX = 'dvc_';

    dvc.diff.mockResolvedValue(dvc_diff);
    dvc.metrics_diff.mockResolvedValue(dvc_metrics_diff);
    git.log.mockResolvedValue(others);

    const dvc_report = await ci.dvc_report({ from, to });

    expect(report.no_tag_warning.mock.calls.length).toBe(0);
    expect(dvc_report.md).toMatchSnapshot();
    expect(dvc_report.html).toMatchSnapshot();
  });
});
