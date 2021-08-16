const GithubClient = require('./github');

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

    const { owner, repo } = client.ownerRepo();
    const parts = REPO.split('/');
    expect(owner).toBe(parts[parts.length - 2]);
    expect(repo).toBe(parts[parts.length - 1]);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commitSha = SHA;

    await client.commentCreate({ report, commitSha });
  });

  test('Publish', async () => {
    await expect(client.upload()).rejects.toThrow(
      'Github does not support publish!'
    );
  });

  test('Runner token', async () => {
    const output = await client.runnerToken();
    expect(output.length).toBe(29);
  });
});
