const CML = require('../src/cml').default;

describe('Github tests', () => {
  test('Runner Gitlab logs', async () => {
    const cml = new CML();
    cml.driver = 'gitlab';
    let log = await cml.parseRunnerLog({
      data: '{"level":"info","msg":"Starting runner for https://gitlab.com with token 2SGFrnGt ...","time":"2021-07-02T16:45:05Z"}'
    });
    expect(log.status).toBe('ready');

    log = cml.parseRunnerLog({
      data: '{"job":1396213069,"level":"info","msg":"Checking for jobs... received","repo_url":"https://gitlab.com/iterative.ai/fashion_mnist.git","runner":"2SGFrnGt","time":"2021-07-02T16:45:47Z"}'
    });
    expect(log.status).toBe('job_started');

    log = cml.parseRunnerLog({
      data: '{"duration_s":120.0120526,"job":1396213069,"level":"info","msg":"Job succeeded: execution took longer than 2m0s seconds","project":27856642,"runner":"2SGFrnGt","time":"2021-07-02T16:47:47Z"}'
    });
    expect(log.status).toBe('job_ended');
    expect(log.success).toBe(true);

    log = cml.parseRunnerLog({
      data: '{"duration_s":120.0120526,"job":1396213069,"level":"warning","msg":"Job failed: execution took longer than 2m0s seconds","project":27856642,"runner":"2SGFrnGt","time":"2021-07-02T16:47:47Z"}'
    });
    expect(log.status).toBe('job_ended');
    expect(log.success).toBe(false);
  });
});
