const CML = require('./cml');

describe('Github tests', () => {
  const OLD_ENV = process.env;

  const {
    TEST_GITHUB_TOKEN: TOKEN,
    TEST_GITHUB_REPO: REPO,
    TEST_GITHUB_SHA: SHA
  } = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.repo_token = TOKEN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('driver has to be github', async () => {
    const cml = new CML();
    expect(cml.driver).toBe('github');
  });

  test('driver has to be github', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN });
    expect(cml.driver).toBe('github');
  });

  test('Publish image without markdown returns an url', async () => {
    const path = `${__dirname}/../assets/logo.png`;

    const output = await new CML().publish({ path });

    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish image with markdown', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const title = 'my title';

    const output = await new CML().publish({ path, md: true, title });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
  });

  test('Publish a non image file in markdown', async () => {
    const path = `${__dirname}/../assets/logo.pdf`;
    const title = 'my title';

    const output = await new CML().publish({ path, md: true, title });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
  });

  test('Comment should succeed with a valid sha', async () => {
    const report = '## Test comment';

    await new CML({ repo: REPO }).comment_create({ report, commit_sha: SHA });
  });

  test('Comment should fail with a invalid sha', async () => {
    let catched_err;
    try {
      const report = '## Test comment';
      const commit_sha = 'invalid_sha';

      await new CML({ repo: REPO }).comment_create({ report, commit_sha });
    } catch (err) {
      catched_err = err.message;
    }

    expect(catched_err).toBe('No commit found for SHA: invalid_sha');
  });
});

describe('Gitlab tests', () => {
  const OLD_ENV = process.env;

  const {
    TEST_GITLAB_TOKEN: TOKEN,
    TEST_GITLAB_REPO: REPO,
    TEST_GITLAB_SHA: SHA
  } = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.repo_token = TOKEN;
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
      gitlab_uploads: true
    });

    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish image using gl with markdown', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const title = 'my title';

    const output = await new CML({ repo: REPO }).publish({
      path,
      md: true,
      title,
      gitlab_uploads: true
    });

    expect(output.startsWith('![](https://')).toBe(true);
    expect(output.endsWith(` "${title}")`)).toBe(true);
  });

  test('Publish a non image file using gl in markdown', async () => {
    const path = `${__dirname}/../assets/logo.pdf`;
    const title = 'my title';

    const output = await new CML({ repo: REPO }).publish({
      path,
      md: true,
      title,
      gitlab_uploads: true
    });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
  });

  test('Comment should succeed with a valid sha', async () => {
    const report = '## Test comment';
    await new CML({ repo: REPO }).comment_create({ report, commit_sha: SHA });
  });

  test('Comment should fail with a unvalid sha', async () => {
    let catched_err;
    try {
      const report = '## Test comment';
      const commit_sha = 'invalid_sha';

      await new CML({ repo: REPO }).comment_create({ report, commit_sha });
    } catch (err) {
      catched_err = err.message;
    }

    expect(catched_err).toBe('Not Found');
  });
});
