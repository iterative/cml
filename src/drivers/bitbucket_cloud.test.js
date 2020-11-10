jest.setTimeout(20000);

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
    const path = `${__dirname}/../../assets/logo.png`;
    const { uri } = await client.upload({ path });

    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const output = await client.runner_token();

    expect(output.length).toBe(20);
  });
});
