jest.setTimeout(20000);

const GithubClient = require('./GithubClient');

const TOKEN = process.env.TEST_GITHUB_TOKEN || process.env.repo_token;
const GITHUB_REPOSITORY = 'DavidGOrtega/3_tensorboard';
const REPO = `https://github.com/${GITHUB_REPOSITORY}`;
const SHA = 'ee672b3b35c21b440c6fe6890de2fe769fbdbcee';

describe('Non Enviromental tests', () => {
  console.log({ repo: REPO, token: TOKEN });
  const client = new GithubClient({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);

    const { owner, repo } = client.owner_repo();
    const parts = GITHUB_REPOSITORY.split('/');
    expect(owner).toBe(parts[0]);
    expect(repo).toBe(parts[1]);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commit_sha = SHA;

    await client.comment_create({ report, commit_sha });
  });

  test('Check', async () => {
    const report = '## Hi this check should be neutral';
    const title = 'CML neutral test';
    const conclusion = `neutral`;

    const output = await client.check_create({ report, title, conclusion });
    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish', async () => {
    await expect(client.publish()).rejects.toThrow(
      'Github does not support publish!'
    );
  });

  test('Runner token', async () => {
    const output = await client.runner_token();
    expect(output.length).toBe(29);
  });
});

/*
describe('Enviromental tests', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.repo_token = TOKEN;
    process.env.GITHUB_REPOSITORY = GITHUB_REPOSITORY;
    process.env.GITHUB_SHA = SHA;
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('Env', async () => {
    const client = new GithubClient({});

    expect(client.env_is_pr()).toBe(false);
    expect(client.env_head_sha()).toBe(SHA);
    expect(client.env_repo()).toBe(REPO);
    expect(client.env_token()).toBe(TOKEN);

    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);

    const { owner, repo } = client.owner_repo();
    const parts = GITHUB_REPOSITORY.split('/');
    expect(owner).toBe(parts[0]);
    expect(repo).toBe(parts[1]);
  });

  test('Comment', async () => {
    const client = new GithubClient({});
    const report = '## Test comment';

    await client.comment_create({ report });
  });

  test('Check', async () => {
    const client = new GithubClient({});
    const report = '## Hi this check should be neutral';
    const title = 'CML neutral test';
    const conclusion = `neutral`;

    const output = await client.check_create({ report, title, conclusion });
    expect(output.startsWith('https://')).toBe(true);
  });

  test('Publish', async () => {
    const client = new GithubClient({});
    await expect(client.publish()).rejects.toThrow(
      'Github does not support publish!'
    );
  });

  test('Runner token', async () => {
    const client = new GithubClient({});
    const output = await client.runner_token();
    expect(output.length).toBe(29);
  });
});
*/
