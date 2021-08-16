const GitlabClient = require('./gitlab');

const {
  TEST_GITLAB_TOKEN: TOKEN,
  TEST_GITLAB_REPO: REPO,
  TEST_GITLAB_SHA: SHA
} = process.env;

describe('Non Enviromental tests', () => {
  const client = new GitlabClient({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commitSha = SHA;

    const { created_at: createdAt } = await client.commentCreate({
      report,
      commitSha
    });

    expect(createdAt).not.toBeUndefined();
  });

  test('Check', async () => {
    await expect(client.checkCreate()).rejects.toThrow(
      'Gitlab does not support check!'
    );
  });

  test('Publish', async () => {
    const path = `${__dirname}/../../assets/logo.png`;
    const { uri } = await client.upload({ path });

    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const output = await client.runnerToken();

    expect(output.length).toBe(20);
  });
});
