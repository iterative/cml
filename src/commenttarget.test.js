const { parseCommentTarget } = require('../src/commenttarget');

describe('comment target tests', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  test('qualified comment target: pr', async () => {
    const target = await parseCommentTarget({
      target: 'pr/3'
    });
    expect(target).toEqual({ target: 'pr', prNumber: '3' });
  });

  test('qualified comment target: commit', async () => {
    const target = await parseCommentTarget({
      target: 'commit/abcdefg'
    });
    expect(target).toEqual({ target: 'commit', commitSha: 'abcdefg' });
  });

  test('qualified comment target: issue', async () => {
    const target = await parseCommentTarget({
      target: 'issue/3'
    });
    expect(target).toEqual({ target: 'issue', issueId: '3' });
  });

  test('qualified comment target: unsupported', async () => {
    try {
      await parseCommentTarget({
        target: 'unsupported/3'
      });
    } catch (error) {
      expect(error.message).toBe('unsupported comment target "unsupported/3"');
    }
  });

  test('legacy flag: commitSha', async () => {
    const drv = { warn: () => {} };
    const target = await parseCommentTarget({
      drv,
      commitSha: 'abcdefg',
      target: 'issue/3' // target will be replaced with commit
    });
    expect(target).toEqual({ target: 'commit', commitSha: 'abcdefg' });
  });

  // Test retrieving the PR id from the driver's context.
  test('legacy flag: pr, context', async () => {
    const drv = {
      warn: () => {},
      pr: '4' // driver returns the PR id from context
    };
    const target = await parseCommentTarget({
      drv,
      pr: true,
      target: 'issue/3' // target will be replaced
    });
    expect(target).toEqual({ target: 'pr', prNumber: '4' });
  });

  // Test calculating the PR id based on the commit sha.
  test('legacy flag: pr, commit sha', async () => {
    const drv = {
      warn: () => {},
      pr: null, // not in PR context
      commitPrs: () => [{ url: 'forge/pr/4' }],
      sha: 'abcdefg'
    };
    const target = await parseCommentTarget({
      drv,
      pr: true,
      target: 'issue/3' // target will be replaced
    });
    expect(target).toEqual({ target: 'pr', prNumber: '4' });
  });

  // Test using driver supplied commit sha.
  test('unqualified flag: commit sha', async () => {
    const drv = {
      warn: () => {},
      sha: 'abcdefg'
    };
    const target = await parseCommentTarget({
      drv,
      target: 'commit'
    });
    expect(target).toEqual({ target: 'commit', commitSha: 'abcdefg' });
  });

  // Test retrieving the PR id from the driver's context.
  test('unqualified flag: pr, context', async () => {
    const drv = {
      warn: () => {},
      pr: '4' // driver returns the PR id from context
    };
    const target = await parseCommentTarget({
      drv,
      target: 'pr' // target will be replaced
    });
    expect(target).toEqual({ target: 'pr', prNumber: '4' });
  });

  // Test calculating the PR id based on the commit sha.
  test('unqualified flag: pr, commit sha', async () => {
    const drv = {
      warn: () => {},
      pr: null, // not in PR context
      commitPrs: () => [{ url: 'forge/pr/4' }],
      sha: 'abcdefg'
    };
    const target = await parseCommentTarget({
      drv,
      pr: true,
      target: 'pr' // target will be replaced
    });
    expect(target).toEqual({ target: 'pr', prNumber: '4' });
  });

  test('unqualified comment target: issue', async () => {
    try {
      await parseCommentTarget({
        target: 'issue'
      });
    } catch (error) {
      expect(error.message).toBe('Failed to parse comment --target="issue"');
    }
  });

  test('auto comment target: pr context', async () => {
    const drv = {
      warn: () => {},
      pr: '4' // driver returns the PR id from context
    };

    const target = await parseCommentTarget({
      drv,
      target: 'auto'
    });
    expect(target).toEqual({ target: 'pr', prNumber: '4' });
  });

  test('auto comment target: pr, commit sha', async () => {
    const drv = {
      warn: () => {},
      pr: null, // not in PR context
      commitPrs: () => [{ url: 'forge/pr/5' }],
      sha: 'abcdefg'
    };

    const target = await parseCommentTarget({
      drv,
      target: 'auto'
    });
    expect(target).toEqual({ target: 'pr', prNumber: '5' });
  });

  test('auto comment target: fallback commit sha', async () => {
    const drv = {
      warn: () => {},
      pr: null, // not in PR context
      commitPrs: () => [],
      sha: 'abcdefg'
    };

    const target = await parseCommentTarget({
      drv,
      target: 'auto'
    });
    expect(target).toEqual({ target: 'commit', commitSha: 'abcdefg' });
  });
});
