const { Watermark } = require('../src/watermark');

describe('watermark tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('append watermark to report', async () => {
    const watermark = new Watermark({
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(report).toEqual(
      'some report\n\n![](https://cml.dev/watermark.png#deadbeef "CML watermark")'
    );
  });

  test('append watermark with label to report', async () => {
    const watermark = new Watermark({
      label: 'some-label',
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(report).toEqual(
      'some report\n\n![](https://cml.dev/watermark.png#deadbeef "CML watermark some-label")'
    );
  });

  test('append watermark with workflow placeholder to report', async () => {
    const watermark = new Watermark({
      label: 'some-label-{workflow}',
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(report).toEqual(
      'some report\n\n![](https://cml.dev/watermark.png#deadbeef "CML watermark some-label-workflow-id")'
    );
  });

  test('append watermark with run placeholder to report', async () => {
    const watermark = new Watermark({
      label: 'some-label-{run}',
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(report).toEqual(
      'some report\n\n![](https://cml.dev/watermark.png#deadbeef "CML watermark some-label-run-id")'
    );
  });

  test('check for presence of the watermark in a report', async () => {
    const watermark = new Watermark({
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(watermark.isIn(report)).toEqual(true);
  });

  test('check for presence of the watermark with special chars in a report', async () => {
    const watermark = new Watermark({
      label: 'custom_1[*]-vm',
      workflow: 'workflow-id',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');
    expect(watermark.isIn(report)).toEqual(true);
  });

  test('check for presence of the watermark in a report, different sha', async () => {
    const watermark = new Watermark({
      label: 'some-label-{run}',
      run: 'run-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');

    // Watermark with a different sha, created by a CI run on
    // a different HEAD commit.
    const newWatermark = new Watermark({
      label: 'some-label-{run}',
      run: 'run-id',
      sha: 'abcd'
    });

    expect(newWatermark.isIn(report)).toEqual(true);
  });

  test('check for watermark mismatch', async () => {
    const watermark = new Watermark({
      label: 'some-label-{workflow}',
      workflow: 'workflow-id',
      sha: 'deadbeef'
    });
    const report = watermark.appendTo('some report');

    // Watermark with a different sha and different
    // workflow.
    const newWatermark = new Watermark({
      workflow: 'different-workflow-id',
      label: 'some-label-{workflow}',
      run: 'run-id',
      sha: 'abcd'
    });

    expect(newWatermark.isIn(report)).toEqual(false);
  });
});
