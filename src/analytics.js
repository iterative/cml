const os = require('os');
const path = require('path');
const fs = require('fs').promises;

const fetch = require('node-fetch');
const ProxyAgent = require('proxy-agent');
const { v4: uuidv4, v5: uuidv5 } = require('uuid');
const winston = require('winston');

const { version: VERSION } = require('../package.json');
const { exec } = require('./utils');

const {
  TPI_ANALYTICS_ENDPOINT = 'https://telemetry.cml.dev/api/v1/s2s/event?ip_policy=strict',
  TPI_ANALYTICS_TOKEN = 's2s.jtyjusrpsww4k9b76rrjri.bl62fbzrb7nd9n6vn5bpqt',
  ITERATIVE_DO_NOT_TRACK,

  GITHUB_SERVER_URL,
  GITHUB_REPOSITORY_OWNER,
  // GITHUB_ACTOR,
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

const deterministic = (str) => {
  return uuidv5(str, 'iterative.ai');
};

const guessCI = () => {
  if (GITHUB_SERVER_URL) return 'github';
  if (CI_SERVER_URL) return 'gitlab';
  if (BITBUCKET_WORKSPACE) return 'bitbucket';
  if (TF_BUILD) return 'azure';
  if (CI) return 'unknown';
  return '';
};

const isCI = () => {
  const ci = guessCI();
  return ci > 0;
};

const groupId = () => {
  if (!isCI()) return '';

  const ci = guessCI();
  let rawId = 'CI';
  if (ci === 'github') {
    rawId = `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY_OWNER}`;
  } else if (ci === 'gitlab') {
    rawId = `${CI_SERVER_URL}/${CI_PROJECT_ROOT_NAMESPACE}`;
  } else if (ci === 'bitbucket') {
    rawId = BITBUCKET_WORKSPACE;
  }

  return deterministic(rawId);
};

const userId = async () => {
  if (isCI()) {
    let rawId;
    const ci = guessCI();

    if (ci === 'github') {
      // TODO: GITHUB_ACTOR
      const { name, login, id } = {};
      rawId = `${name} ${login} ${id}`;
    } else if (ci === 'gitlab') {
      rawId = `${GITLAB_USER_NAME} ${GITLAB_USER_LOGIN} ${GITLAB_USER_ID}`;
    } else if (ci === 'bitbucket') {
      rawId = BITBUCKET_STEP_TRIGGERER_UUID;
    } else {
      rawId = await exec(`git log -1 --pretty=format:'%ae'`);
    }

    return deterministic(rawId);
  }

  let id = uuidv4();
  const newPath = '';
  const oldPath = '';
  if (path.exists(newPath)) {
    id = await fs.readFile(newPath);
  } else {
    if (path.exists(oldPath)) {
      const json = await fs.readFile(oldPath);
      ({ id } = JSON.parse(json));
    }

    await fs.mkdir(path.diname(newPath), { recursive: true });
    await fs.writeFile(newPath, id);
  }

  if (!path.exists(oldPath) && id !== ID_DO_NOT_TRACK) {
    await fs.mkdir(path.diname(oldPath), { recursive: true });
    await fs.writeFile(oldPath, JSON.stringify({ user_id: id }));
  }

  return id;
};

const OS = () => {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'macos';

  return process.platform;
};

const jitsuEventPayload = async ({ action, extra = {}, error = '' } = {}) => {
  extra.ci = guessCI();
  const { backend, ...extraRest } = extra;

  return {
    user_id: userId(),
    groupId: groupId(),
    action,
    interface: 'cli',
    tool_name: 'cml',
    tool_version: VERSION,
    tool_source: '',
    os_name: OS(),
    os_version: os.release(),
    backend,
    error,
    extra: { ...extraRest }
  };
};

const send = async () => {
  try {
    if (ITERATIVE_DO_NOT_TRACK) return;

    const payload = await jitsuEventPayload();
    if (payload.id === ID_DO_NOT_TRACK) return;

    await fetch(TPI_ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'X-Auth-Toke': TPI_ANALYTICS_TOKEN,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      agent: new ProxyAgent()
    });
  } catch (err) {
    winston.debug(`Send analytics failed: ${err.message}`);
  }
};

exports.deterministic = deterministic;
exports.isCI = isCI;
exports.guessCI = guessCI;
exports.userId = userId;
exports.groupId = groupId;
exports.jitsuEventPayload = jitsuEventPayload;
exports.send = send;
