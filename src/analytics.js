const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const fetch = require('node-fetch');
const { ProxyAgent } = require('proxy-agent');
const { promisify } = require('util');
const { scrypt } = require('crypto');
const { v4: uuidv4, v5: uuidv5, parse } = require('uuid');
const { userConfigDir } = require('appdirs');
const { logger } = require('./logger');
const isDocker = require('is-docker');

const { version: VERSION } = require('../package.json');
const { exec, fileExists, getos } = require('./utils');

const {
  ITERATIVE_ANALYTICS_ENDPOINT = 'https://telemetry.cml.dev/api/v1/s2s/event?ip_policy=strict',
  ITERATIVE_ANALYTICS_TOKEN = 's2s.jtyjusrpsww4k9b76rrjri.bl62fbzrb7nd9n6vn5bpqt',
  ITERATIVE_DO_NOT_TRACK,
  CODESPACES,
  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY_OWNER,
  GITHUB_ACTOR,
  GITHUB_REPOSITORY,
  CI_SERVER_URL,
  CI_PROJECT_ROOT_NAMESPACE,
  GITLAB_USER_NAME,
  GITLAB_USER_LOGIN,
  GITLAB_USER_ID,
  BITBUCKET_WORKSPACE,
  BITBUCKET_STEP_TRIGGERER_UUID,
  TF_BUILD,
  CI
} = process.env;

const ID_DO_NOT_TRACK = 'do-not-track';

const deterministic = async (data) => {
  if (!data)
    throw new Error("data is not set, can't calculate a deterministic uuid");

  const namespace = uuidv5('iterative.ai', uuidv5.DNS);
  const name = await promisify(scrypt)(data, parse(namespace), 8, {
    N: 1 << 16,
    r: 8,
    p: 1,
    maxmem: 128 * 1024 ** 2
  });

  return uuidv5(name.toString('hex'), namespace);
};

const guessCI = () => {
  if (GITHUB_SERVER_URL && !CODESPACES) return 'github';
  if (CI_SERVER_URL) return 'gitlab';
  if (BITBUCKET_WORKSPACE) return 'bitbucket';
  if (TF_BUILD) return 'azure';
  if (CI) return 'unknown';
  return '';
};

const isCI = () => {
  const ci = guessCI();
  return ci.length > 0;
};

const groupId = async () => {
  if (!isCI()) return '';

  const ci = guessCI();
  let rawId = 'CI';
  if (ci === 'github') {
    rawId = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY_OWNER}`;
  } else if (ci === 'gitlab') {
    rawId = `${CI_SERVER_URL}/${CI_PROJECT_ROOT_NAMESPACE}`;
  } else if (ci === 'bitbucket') {
    rawId = `https://bitbucket.com/${BITBUCKET_WORKSPACE}`;
  }

  return await deterministic(rawId);
};

const userId = async ({ cml } = {}) => {
  try {
    if (isCI()) {
      let rawId;
      const ci = guessCI();
      if (ci === 'github') {
        const { name, login, id } = await cml
          .getDriver()
          .user({ name: GITHUB_ACTOR });
        rawId = `${name || ''} ${login} ${id}`;
      } else if (ci === 'gitlab') {
        rawId = `${GITLAB_USER_NAME} ${GITLAB_USER_LOGIN} ${GITLAB_USER_ID}`;
      } else if (ci === 'bitbucket') {
        rawId = BITBUCKET_STEP_TRIGGERER_UUID;
      } else {
        rawId = await exec('git', 'log', '-1', "--pretty=format:'%ae'");
      }

      return await deterministic(rawId);
    }

    let id = uuidv4();
    const oldPath = userConfigDir('dvc/user_id', 'iterative');
    const newPath = userConfigDir('iterative/telemetry');
    const readId = async ({ fpath }) => {
      const content = (await fs.readFile(fpath)).toString('utf-8');
      try {
        const { user_id: id } = JSON.parse(content);
        return id;
      } catch (err) {
        return content;
      }
    };

    const writeId = async ({ fpath, id }) => {
      await fs.mkdir(path.dirname(fpath), { recursive: true });
      await fs.writeFile(fpath, JSON.stringify({ user_id: id }));
    };

    if (await fileExists(newPath)) {
      id = await readId({ fpath: newPath });
    } else {
      if (await fileExists(oldPath)) id = await readId({ fpath: oldPath });

      await writeId({ fpath: newPath, id });
    }

    if (!(await fileExists(oldPath)) && id !== ID_DO_NOT_TRACK)
      await writeId({ fpath: oldPath, id });

    return id;
  } catch (err) {
    logger.debug(`userId failure: ${err.message}`);
  }
};

const OS = () => {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'macos';

  return process.platform;
};

const jitsuEventPayload = async ({
  action = '',
  error,
  extra = {},
  cml
} = {}) => {
  try {
    const { cloud: backend = '', ...extraRest } = extra;

    const osname = OS();
    let { release = os.release() } = await getos();
    if (osname === 'windows') {
      const [major, minor, build] = release.split('.');
      release = `${build}.${major}.${minor}-`;
    }

    return {
      user_id: await userId({ cml }),
      group_id: await groupId(),
      action,
      interface: 'cli',
      tool_name: 'cml',
      tool_version: VERSION,
      tool_source: '',
      os_name: osname,
      os_version: release,
      backend,
      error,
      extra: {
        ...extraRest,
        ci: guessCI(),
        container:
          process.env._CML_CONTAINER_IMAGE === 'true' ? 'cml' : isDocker()
      }
    };
  } catch (err) {
    return {};
  }
};

const send = async ({
  event,
  endpoint = ITERATIVE_ANALYTICS_ENDPOINT,
  token = ITERATIVE_ANALYTICS_TOKEN
} = {}) => {
  try {
    if (ITERATIVE_DO_NOT_TRACK) return;
    if (!event.user_id || event.user_id === ID_DO_NOT_TRACK) return;

    // Exclude runs from GitHub Codespaces at Iterative
    if (GITHUB_REPOSITORY.startsWith('iterative/')) return;

    // Exclude continuous integration tests and internal projects from analytics
    if (
      [
        'dc16cd76-71b7-5afa-bf11-e85e02ee1554', // deterministic("https://github.com/iterative")
        'b0e229bf-2598-54b7-a3e0-81869cdad579', // deterministic("https://github.com/iterative-test")
        'd5aaeca4-fe6a-5c72-8aa7-6dcd65974973', // deterministic("https://gitlab.com/iterative.ai")
        'b6df227b-5b3d-5190-a8fa-d272b617ee6c', // deterministic("https://gitlab.com/iterative-test")
        '2c6415f0-cb5a-5e52-8c81-c5af4f11715d', // deterministic("https://bitbucket.com/iterative-ai")
        'c0b86b90-d63c-5fb0-b84d-718d8e15f8d6' // deterministic("https://bitbucket.com/iterative-test")
      ].includes(event.group_id)
    )
      return;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5 * 1000);
    await fetch(endpoint, {
      signal: controller.signal,
      method: 'POST',
      headers: {
        'X-Auth-Token': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(event),
      agent: new ProxyAgent()
    });
    clearInterval(id);
  } catch (err) {
    logger.debug(`Send analytics failed: ${err.message}`);
  }
};

exports.deterministic = deterministic;
exports.isCI = isCI;
exports.guessCI = guessCI;
exports.userId = userId;
exports.groupId = groupId;
exports.jitsuEventPayload = jitsuEventPayload;
exports.send = send;
