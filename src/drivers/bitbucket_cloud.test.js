const BitbucketCloud = require('./bitbucket_cloud');
const {
  TEST_BBCLOUD_TOKEN: TOKEN,
  TEST_BBCLOUD_REPO: REPO,
  TEST_BBCLOUD_SHA: SHA
} = process.env;

describe('Non Enviromental tests', () => {
  const client = new BitbucketCloud({ repo: REPO, token: TOKEN });

  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });

  test('Comment', async () => {
    const report = '## Test comment';
    const commitSha = SHA;
    const url = await client.commentCreate({ report, commitSha });

    expect(url.startsWith('https://')).toBe(true);
  });

  test('Check', async () => {
    await expect(client.checkCreate()).rejects.toThrow(
      'Bitbucket Cloud does not support check!'
    );
  });

  test('Publish', async () => {
    const path = `${__dirname}/../../assets/logo.png`;
    await expect(client.upload({ path })).rejects.toThrow(
      'Bitbucket Cloud does not support upload!'
    );
  });

  test('Runner token', async () => {
    await expect(client.runnerToken()).rejects.toThrow(
      'Bitbucket Cloud does not support runnerToken!'
    );
  });

  test('updateGitConfig', async () => {
    const client = new BitbucketCloud({
      repo: 'https://bitbucket.org/test/test',
      token: 'dXNlcjpwYXNz'
    });
    const command = await client.updateGitConfig({
      userName: 'john',
      userEmail: 'john@test.com'
    });
    expect(command).toMatchInlineSnapshot(`
      "
          git config --unset user.name && \\\\
          git config --unset user.email && \\\\
          git config --unset push.default && \\\\
          git config --unset http.http://bitbucket.org/test/test.proxy && \\\\
          git config user.name \\"john\\" && \\\\
          git config user.email \\"john@test.com\\" && \\\\
          git remote set-url origin \\"https://user:pass@bitbucket.org/test/test.git\\""
    `);
  });
});
