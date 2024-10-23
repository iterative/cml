const { send, jitsuEventPayload, isCI } = require('./analytics');
const CML = require('../src/cml').default;

const { TEST_GITHUB_TOKEN: TOKEN, TEST_GITHUB_REPOSITORY: REPO } = process.env;

describe('analytics tests', () => {
  test('userId', async () => {
    const cml = new CML({ repo: REPO, token: TOKEN });
    const action = 'test';
    const cloud = 'azure';
    const container = 'cml';
    const more = { one: 1, two: 2 };
    const extra = { cloud, container, ...more };
    const error = 'Ouch!';
    const regex = /\d+\.\d+\.\d+/;

    const pl = await jitsuEventPayload({ action, error, extra, cml });
    expect(pl.user_id.length).toBe(36);
    expect(pl.action).toBe(action);
    expect(pl.interface).toBe('cli');
    expect(pl.tool_name).toBe('cml');
    expect(regex.test(pl.tool_version)).toBe(true);
    expect(pl.tool_source).toBe('');
    expect(pl.os_name.length > 0).toBe(true);
    expect(pl.os_version.length > 0).toBe(true);
    expect(pl.backend).toBe(cloud);
    expect(pl.error).toBe(error);
    expect(Object.keys(pl.extra).sort()).toEqual(
      ['ci', 'container'].concat(Object.keys(more)).sort()
    );

    if (isCI()) {
      expect(pl.group_id.length).toBe(36);
      expect(pl.extra.ci.length > 0).toBe(true);
    }
  });

  test('Send should never fail', async () => {
    let error = null;
    try {
      const cml = new CML({ repo: REPO, token: TOKEN });
      const action = 'test';
      const event = await jitsuEventPayload({ action, error, cml });
      await send({ event, endpoint: 'https://notfound.cml.dev' });
    } catch (err) {
      error = err;
    }

    expect(error).toBeNull();
  });
});
