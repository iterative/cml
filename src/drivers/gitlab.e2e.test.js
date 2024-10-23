const GitlabClient = require('./gitlab');

const {
  TEST_GITLAB_TOKEN: TOKEN,
  TEST_GITLAB_REPOSITORY: REPO,
  TEST_GITLAB_COMMIT: SHA,
  TEST_GITLAB_ISSUE: ISSUE = 1
} = process.env;

describe('Non Enviromental tests', () => {
  const client = new GitlabClient({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Issue comment', async () => {
    const report = '## Test comment';
    const issueId = ISSUE;
    const url = await client.issueCommentCreate({ issueId, report });

    expect(url.startsWith(REPO)).toBe(true);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commitSha = SHA;
    const url = await client.commitCommentCreate({
      report,
      commitSha
    });

    expect(url.startsWith('https://')).toBe(true);
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
    expect(output.length >= 20).toBe(true);
  });

  test('updateGitConfig', async () => {
    const client = new GitlabClient({
      repo: 'https://gitlab.com/test/test',
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
          "https://token:dXNlcjpwYXNz@gitlab.com/test/test.git",
        ],
      ]
    `);
  });
});
