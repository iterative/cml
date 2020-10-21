jest.setTimeout(20000);

const GithubClient = require('./GithubClient');
const github = require('@actions/github');

const {
  TEST_GITHUB_TOKEN: TOKEN,
  TEST_GITHUB_REPO: REPO,
  TEST_GITHUB_SHA: SHA
} = process.env;

describe('Non Enviromental tests', () => {
  const client = new GithubClient({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);

    const { owner, repo } = client.owner_repo();
    const parts = REPO.split('/');
    expect(owner).toBe(parts[parts.length - 2]);
    expect(repo).toBe(parts[parts.length - 1]);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commit_sha = SHA;

    await client.comment_create({ report, commit_sha });
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

describe('Enviromental tests', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();

    process.env = {};
    process.env.repo_token = TOKEN;
    process.env.GITHUB_SHA = SHA;

    try {
      github.context.payload.pull_request.head.sha = SHA;
    } catch (err) {}

    process.env.GITHUB_REPOSITORY = new URL(REPO).pathname.substring(1);
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('Env', async () => {
    const client = new GithubClient({});

    expect(client.env_head_sha()).toBe(SHA);
    expect(client.env_repo()).toBe(REPO);
    expect(client.env_token()).toBe(TOKEN);

    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);

    const { owner, repo } = client.owner_repo();
    const parts = process.env.GITHUB_REPOSITORY.split('/');
    expect(owner).toBe(parts[0]);
    expect(repo).toBe(parts[1]);
  });

  test('Comment', async () => {
    const client = new GithubClient({});
    const report = '## Test comment';

    await client.comment_create({ report });
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
