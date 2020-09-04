const fetch = require('node-fetch');
const { URLSearchParams } = require('url');

const {
  CI_API_V4_URL,
  CI_PROJECT_PATH = '',
  CI_PROJECT_ID,
  CI_COMMIT_REF_NAME,
  CI_COMMIT_SHA,
  CI_MERGE_REQUEST_ID,
  GITLAB_USER_EMAIL,
  GITLAB_USER_NAME,
  GITLAB_TOKEN,
  repo_token
} = process.env;

const [owner, repo] = CI_PROJECT_PATH.split('/');
const IS_PR = CI_MERGE_REQUEST_ID;
const REF = CI_COMMIT_REF_NAME;
const HEAD_SHA = CI_COMMIT_SHA;
const USER_EMAIL = GITLAB_USER_EMAIL;
const USER_NAME = GITLAB_USER_NAME;

const TOKEN = repo_token || GITLAB_TOKEN;

const comment = async opts => {
  const { commit_sha, report } = opts;

  const endpoint = `${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/repository/commits/${commit_sha}/comments`;

  const body = new URLSearchParams();
  body.append('note', report);

  const headers = { 'PRIVATE-TOKEN': TOKEN };
  await fetch(endpoint, { method: 'POST', headers, body });
};

const get_runner_token = async () => {
  const endpoint = `${CI_API_V4_URL}/projects/${owner}%2F${repo}`;
  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };
  const response = await fetch(endpoint, { method: 'GET', headers });
  const project = await response.json();

  return project.runners_token;
};

const register_runner = async opts => {
  const endpoint = `${CI_API_V4_URL}/runners`;

  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };

  const body = new URLSearchParams();
  body.append('token', opts.token);
  body.append('locked', 'true');
  body.append('run_untagged', 'true');
  body.append('access_level', 'not_protected');
  body.append('tag_list', opts.tags);

  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const runner = await response.json();

  return runner;
};

const handle_error = e => {
  console.error(e.message);
  process.exit(1);
};

exports.is_pr = IS_PR;
exports.ref = REF;
exports.head_sha = HEAD_SHA;
exports.user_email = USER_EMAIL;
exports.user_name = USER_NAME;
exports.comment = comment;
exports.get_runner_token = get_runner_token;
exports.register_runner = register_runner;
exports.handle_error = handle_error;

exports.CHECK_TITLE = 'CML Report';
