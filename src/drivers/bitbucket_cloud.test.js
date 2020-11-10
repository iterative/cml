jest.setTimeout(20000);
const BitBucketCloud = require('./bitbucket_cloud');
const {
  TEST_BBCLOUD_TOKEN: TOKEN,
  TEST_BBCLOUD_REPO: REPO,
  TEST_BBCLOUD_SHA: SHA
} = process.env;
describe('Non Enviromental tests', () => {
  const client = new BitBucketCloud({ repo: REPO, token: TOKEN });
  test('test repo and token', async () => {
    expect(client.repo).toBe(REPO);
    expect(client.token).toBe(TOKEN);
  });
  test('Comment', async () => {
    const report = '## Test comment';
    const commit_sha = SHA;

    await client.comment_create({ report, commit_sha });
  });
  test('Check', async () => {
    await expect(client.check_create()).rejects.toThrow(
      'BitBucket Cloud does not support check!'
    );
  });
  test('Publish', async () => {
    const path = `${__dirname}/../../assets/logo.png`;
    await expect(client.upload({ path })).rejects.toThrow(
      'BitBucket Cloud does not support upload!'
    );
  });
  test('Runner token', async () => {
    await expect(client.runner_token()).rejects.toThrow(
      'BitBucket Cloud does not support runner_token!'
    );
  });
});
