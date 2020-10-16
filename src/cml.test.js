const CML = require('./cml');

describe('Github tests', () => {
  const OLD_ENV = process.env;

  const TOKEN = process.env.TEST_GITHUB_TOKEN || process.env.repo_token;
  const GITHUB_REPOSITORY = 'DavidGOrtega/3_tensorboard';
  const REPO = `https://github.com/${GITHUB_REPOSITORY}`;
  const SHA = 'ee672b3b35c21b440c6fe6890de2fe769fbdbcee';

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.GITHUB_REPOSITORY = GITHUB_REPOSITORY;
    process.env.repo_token = TOKEN;
    process.env.GITHUB_SHA = SHA;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('env driver has to be github', async () => {
    const cml = new CML();
    expect(cml.driver).toBe('github');
  });

  test('driver has to be github', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN, driver: 'github' });
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
    const commit_sha = SHA;

    await new CML().comment_create({ report, commit_sha });
  });

  test('Comment should fail with a unvalid sha', async () => {
    let catched_err;
    try {
      const report = '## Test comment';
      const commit_sha = 'invalid_sha';

      await new CML().comment_create({ report, commit_sha });
    } catch (err) {
      catched_err = err.message;
    }

    expect(catched_err).toBe('No commit found for SHA: invalid_sha');
  });

  test('Check should succeed with a valid sha', async () => {
    const report = '## Test comment';
    const commit_sha = SHA;

    await new CML().check_create({ report, commit_sha });
  });
});

describe('Gitlab tests', () => {
  const OLD_ENV = process.env;

  const TOKEN = process.env.GITLAB_TOKEN || process.env.repo_token;
  const REPO = 'https://gitlab.com/DavidGOrtega/3_tensorboard';

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.CI_PROJECT_URL = REPO;
    process.env.repo_token = TOKEN;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('env driver has to be gitlab', async () => {
    const cml = new CML();
    expect(cml.driver).toBe('gitlab');
  });

  test('driver has to be gitlab', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN, driver: 'gitlab' });
    expect(cml.driver).toBe('gitlab');
  });

  test('Publish image using gl without markdown returns an url', async () => {
    const path = `${__dirname}/../assets/logo.png`;

    const output = await new CML().publish({ path, gitlab_uploads: true });

    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish image using gl with markdown', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const title = 'my title';

    const output = await new CML().publish({
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

    const output = await new CML().publish({
      path,
      md: true,
      title,
      gitlab_uploads: true
    });

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.endsWith(')')).toBe(true);
  });

  test('Comment should fail with a unvalid sha', async () => {
    let catched_err;
    try {
      const report = '## Test comment';
      const commit_sha = 'invalid_sha';

      const response = await new CML().comment_create({ report, commit_sha });
      console.log(response);
    } catch (err) {
      catched_err = err.message;
    }

    expect(catched_err).toBe('HttpError: No commit found for SHA: invalid_sha');
  });
});
