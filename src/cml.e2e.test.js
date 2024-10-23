const CML = require('../src/cml').default;

describe('Github tests', () => {
  const OLD_ENV = process.env;

  const {
    TEST_GITHUB_TOKEN: TOKEN,
    TEST_GITHUB_REPOSITORY: REPO,
    TEST_GITHUB_COMMIT: SHA
  } = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.REPO_TOKEN = TOKEN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('driver has to be github', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN });
    expect(cml.driver).toBe('github');
  });

  test('Publish image without markdown returns an url', async () => {
    const path = `${__dirname}/../assets/logo.png`;

    const output = await new CML().publish({ path });

    expect(output.startsWith('https://')).toBe(true);
    expect(output.includes('cml=png')).toBe(true);
  });

  test('Publish image with markdown', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const title = 'my title';

    const output = await new CML().publish({ path, md: true, title });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
    expect(output.includes('cml=png')).toBe(true);
  });

  test('Publish image embedded in markdown', async () => {
    const path = `${__dirname}/../assets/test.md`;
    const title = 'my title';

    const output = await new CML().publish({ path, md: true, title });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
    expect(output.includes('cml=plain')).toBe(true);
  });

  test('Publish a non image file in markdown', async () => {
    const path = `${__dirname}/../assets/logo.pdf`;
    const title = 'my title';

    const output = await new CML().publish({ path, md: true, title });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
    expect(output.includes('cml=pdf')).toBe(true);
  });

  test('Comment should succeed with a valid sha', async () => {
    const report = '## Test comment';

    await new CML({ repo: REPO }).commentCreate({ report, commitSha: SHA });
  });

  test('Comment should fail with a invalid sha', async () => {
    let caughtErr;
    try {
      const report = '## Test comment';
      const commitSha = 'invalid_sha';

      await new CML({ repo: REPO }).commentCreate({ report, commitSha });
    } catch (err) {
      caughtErr = err.message;
    }

    expect(caughtErr).toBe('No commit found for SHA: invalid_sha');
  });

  test('Runner logs', async () => {
    const cml = new CML();
    cml.driver = 'github';
    let logs = await cml.parseRunnerLog({
      data: `
2022-06-05 16:25:56Z: Listening for Jobs
2022-06-05 16:26:35Z: Running job: train
2022-06-05 16:28:03Z: Job train completed with result: Failed
`
    });
    expect(logs.length).toBe(3);
    expect(logs[0].status).toBe('ready');
    expect(logs[1].status).toBe('job_started');
    expect(logs[2].status).toBe('job_ended');
    expect(logs[2].success).toBe(false);

    logs = await cml.parseRunnerLog({
      data: '2022-06-05 16:28:03Z: Job train completed with result: Succeeded'
    });
    expect(logs[0].status).toBe('job_ended');
    expect(logs[0].success).toBe(true);
  });
});

describe('Gitlab tests', () => {
  const OLD_ENV = process.env;

  const {
    TEST_GITLAB_TOKEN: TOKEN,
    TEST_GITLAB_REPOSITORY: REPO,
    TEST_GITLAB_COMMIT: SHA
  } = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.REPO_TOKEN = TOKEN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('driver has to be gitlab', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN, driver: 'gitlab' });
    expect(cml.driver).toBe('gitlab');
  });

  test('Publish image using gl without markdown returns an url', async () => {
    const path = `${__dirname}/../assets/logo.png`;

    const output = await new CML({ repo: REPO }).publish({
      path,
      native: true
    });

    expect(output.startsWith('https://')).toBe(true);
    expect(output.includes('cml=png')).toBe(true);
  });

  test('Publish image using gl with markdown', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const title = 'my title';

    const output = await new CML({ repo: REPO }).publish({
      path,
      md: true,
      title,
      native: true
    });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
    expect(output.includes('cml=png')).toBe(true);
  });

  test('Publish a non image file using gl in markdown', async () => {
    const path = `${__dirname}/../assets/logo.pdf`;
    const title = 'my title';

    const output = await new CML({ repo: REPO }).publish({
      path,
      md: true,
      title,
      native: true
    });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
    expect(output.includes('cml=pdf')).toBe(true);
  });

  test('Publish a non image file using native', async () => {
    const path = `${__dirname}/../assets/logo.pdf`;
    const title = 'my title';

    const output = await new CML({ repo: REPO }).publish({
      path,
      md: true,
      title,
      native: true
    });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
    expect(output.includes('cml=pdf')).toBe(true);
  });

  test('Publish should fail with an invalid driver', async () => {
    let caughtErr;
    try {
      const path = `${__dirname}/../assets/logo.pdf`;
      await new CML({ repo: REPO, driver: 'invalid' }).publish({
        path,
        md: true,
        native: true
      });
    } catch (err) {
      caughtErr = err.message;
    }

    expect(caughtErr).not.toBeUndefined();
  });

  test('Comment should succeed with a valid sha', async () => {
    const report = '## Test comment';
    await new CML({ repo: REPO }).commentCreate({ report, commitSha: SHA });
  });

  test('Comment should fail with a invalid sha', async () => {
    let caughtErr;
    try {
      const report = '## Test comment';
      const commitSha = 'invalid_sha';

      await new CML({ repo: REPO }).commentCreate({ report, commitSha });
    } catch (err) {
      caughtErr = err.message;
    }

    expect(caughtErr).toBe('Not Found');
  });

  test('Runner logs', async () => {
    const cml = new CML();
    cml.driver = 'gitlab';
    let logs = await cml.parseRunnerLog({
      data: `
{"level":"info","msg":"Starting runner for https://gitlab.com with token 2SGFrnGt ...","time":"2021-07-02T16:45:05Z"}
{"job":1396213069,"level":"info","msg":"Checking for jobs... received","repo_url":"https://gitlab.com/iterative.ai/fashion_mnist.git","runner":"2SGFrnGt","time":"2021-07-02T16:45:47Z"}
{"duration_s":120.0120526,"job":1396213069,"level":"warning","msg":"Job failed: execution took longer than 2m0s seconds","project":27856642,"runner":"2SGFrnGt","time":"2021-07-02T16:47:47Z"}
`
    });
    expect(logs.length).toBe(3);
    expect(logs[0].status).toBe('ready');
    expect(logs[1].status).toBe('job_started');
    expect(logs[2].status).toBe('job_ended');
    expect(logs[2].success).toBe(false);

    logs = await cml.parseRunnerLog({
      data: '{"duration_s":7.706165838,"job":2177867438,"level":"info","msg":"Job succeeded","project":27939020,"runner":"fe36krFK","time":"2022-03-08T18:12:57+01:00"}'
    });
    expect(logs[0].status).toBe('job_ended');
    expect(logs[0].success).toBe(true);
  });
});

describe('Bitbucket tests', () => {
  const OLD_ENV = process.env;

  const { TEST_BITBUCKET_TOKEN: TOKEN = 'DUMMY' } = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.REPO_TOKEN = TOKEN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('Runner logs', async () => {
    const cml = new CML();
    cml.driver = 'bitbucket';
    let logs = await cml.parseRunnerLog({
      data: `
[2022-06-05 17:23:41,945] Updating runner status to "ONLINE" and checking for new steps assigned to the runner after 0 seconds and then every 30 seconds.
[2022-06-05 17:24:12,246] Getting step StepId{accountUuid={XXXXX-XXX-XXX-XXXXXXXX}, repositoryUuid={XXXXX-XXX-XXX-XXXXXXXX}, pipelineUuid={XXXXX-XXX-XXX-XXXXXXXX}, stepUuid={XXXXX-XXX-XXX-XXXXXXXX}}.
[2022-06-05 17:24:53,466] Completing step with result Result{status=FAILED, error=None}.
`
    });
    expect(logs.length).toBe(3);
    expect(logs[0].status).toBe('ready');
    expect(logs[1].status).toBe('job_started');
    expect(logs[2].status).toBe('job_ended');
    expect(logs[2].success).toBe(false);

    logs = await cml.parseRunnerLog({
      data: '[2022-06-05 17:24:53,466] Completing step with result Result{status=PASSED, error=None}.'
    });
    expect(logs[0].status).toBe('job_ended');
    expect(logs[0].success).toBe(true);
  });
});
