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

    await client.commentCreate({ report, commitSha });
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
});
