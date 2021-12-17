const GitlabClient = require('./gitlab');

const {
  TEST_GITLAB_TOKEN: TOKEN,
  TEST_GITLAB_REPO: REPO,
  TEST_GITLAB_SHA: SHA
} = process.env;

describe('Non Enviromental tests', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...OLD_ENV };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('test repo and token', async () => {
    const client = new GitlabClient({ repo: REPO, token: TOKEN });
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Comment', async () => {
    const client = new GitlabClient({ repo: REPO, token: TOKEN });
    const report = '## Test comment';
    const commitSha = SHA;
    const url = await client.commentCreate({
      report,
      commitSha
    });

    expect(url.startsWith('https://')).toBe(true);
  });

  test('Check', async () => {
    const client = new GitlabClient({ repo: REPO, token: TOKEN });
    await expect(client.checkCreate()).rejects.toThrow(
      'Gitlab does not support check!'
    );
  });

  test('Publish', async () => {
    const client = new GitlabClient({ repo: REPO, token: TOKEN });
    const path = `${__dirname}/../../assets/logo.png`;
    const { uri } = await client.upload({ path });

    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const client = new GitlabClient({ repo: REPO, token: TOKEN });
    const output = await client.runnerToken();

    expect(output.length).toBe(20);
  });

  test.skip('updateGitConfig', async () => {
    process.env.GITLAB_USER_NAME = 'james';

    const client = new GitlabClient({
      repo: 'https://gitlab.com/test/test',
      token: 'dXNlcjpwYXNz'
    });
    const command = await client.updateGitConfig({
      userName: 'john',
      userEmail: 'john@test.com'
    });
    expect(command).toMatchInlineSnapshot(`
      "
          git config user.name \\"john\\" && \\\\
          git config user.email \\"john@test.com\\" && \\\\
          git remote set-url origin \\"https://james:dXNlcjpwYXNz@gitlab.com/test/test.git\\""
    `);
  });
});
