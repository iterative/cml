const BitbucketCloud = require('./bitbucket_cloud');
const {
  TEST_BITBUCKET_TOKEN: TOKEN,
  TEST_BITBUCKET_REPOSITORY: REPO,
  TEST_BITBUCKET_COMMIT: SHA,
  TEST_BITBUCKET_ISSUE: ISSUE = 1
} = process.env;

describe('Non Enviromental tests', () => {
  const client = new BitbucketCloud({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Issue comment', async () => {
    const report = '## Test comment';
    const issueId = ISSUE;
    const url = await client.issueCommentCreate({ report, issueId });

    expect(url.startsWith('https://')).toBe(true);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commitSha = SHA;
    const url = await client.commitCommentCreate({ report, commitSha });

    expect(url.startsWith(REPO)).toBe(true);
  });

  test('Check', async () => {
    await expect(client.checkCreate()).rejects.toThrow(
      'Bitbucket Cloud does not support check!'
    );
  });

  test('Publish', async () => {
    const path = `${__dirname}/../../assets/logo.png`;
    const { uri } = await client.upload({ path });

    expect(uri).not.toBeUndefined();
  });

  test('Runner token', async () => {
    const token = await client.runnerToken();
    await expect(token).toBe('DUMMY');
  });

  test('updateGitConfig', async () => {
    const client = new BitbucketCloud({
      repo: 'http://bitbucket.org/test/test',
      token: 'dXNlcjpwYXNz'
    });
    const command = await client.updateGitConfig({
      userName: 'john',
      userEmail: 'john@test.com',
      remote: 'origin'
    });
    expect(command).toMatchInlineSnapshot(`
      Array [
        Array [
          "git",
          "config",
          "--unset",
          "user.name",
        ],
        Array [
          "git",
          "config",
          "--unset",
          "user.email",
        ],
        Array [
          "git",
          "config",
          "--unset",
          "push.default",
        ],
        Array [
          "git",
          "config",
          "--unset",
          "http.http://bitbucket.org/test/test.proxy",
        ],
        Array [
          "git",
          "config",
          "user.name",
          "john",
        ],
        Array [
          "git",
          "config",
          "user.email",
          "john@test.com",
        ],
        Array [
          "git",
          "remote",
          "set-url",
          "origin",
          "https://user:pass@bitbucket.org/test/test",
        ],
      ]
    `);
  });
});
