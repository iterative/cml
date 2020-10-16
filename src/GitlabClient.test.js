jest.setTimeout(20000);

const GitlabClient = require('./GitlabClient');

const TOKEN = process.env.GITLAB_TOKEN || process.env.repo_token;
const REPO = 'https://gitlab.com/DavidGOrtega/3_tensorboard';
const SHA = '2dc250a9449728356913e1f0e30758a44da65a12';

describe('Non Enviromental tests', () => {
  const client = new GitlabClient({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commit_sha = SHA;

    const { created_at } = await client.comment_create({ report, commit_sha });
    expect(created_at).not.toBeUndefined();
  });

  test('Check', async () => {
    await expect(client.check_create()).rejects.toThrow(
      'Gitlab does not support check!'
    );
  });

  test('Publish', async () => {
    const path = `${__dirname}/../assets/logo.png`;
    const { uri } = await client.publish({ path });

    console.log(uri);
    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const output = await client.runner_token();
    expect(output.length).toBe(20);
  });
});

describe('Enviromental tests', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.repo_token = TOKEN;
    process.env.CI_PROJECT_URL = REPO;
    process.env.CI_COMMIT_SHA = SHA;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('Env', async () => {
    const client = new GitlabClient();

    expect(client.env_is_pr()).toBe(false);
    expect(client.env_head_sha()).toBe(SHA);
    expect(client.env_repo()).toBe(REPO);
    expect(client.env_token()).toBe(TOKEN);

    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Comment', async () => {
    const client = new GitlabClient();
    const report = '## Test comment';

    const { created_at } = await client.comment_create({ report });
    expect(created_at).not.toBeUndefined();
  });

  test('Check', async () => {
    const client = new GitlabClient();
    await expect(client.check_create()).rejects.toThrow(
      'Gitlab does not support check!'
    );
  });

  test('Publish', async () => {
    const client = new GitlabClient();
    const path = `${__dirname}/../assets/logo.png`;
    const { uri } = await client.publish({ path });

    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const client = new GitlabClient();
    const output = await client.runner_token();
    expect(output.length).toBe(20);
  });
});
