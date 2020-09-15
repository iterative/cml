const fetch = require('node-fetch');
const FormData = require('form-data');
const { URLSearchParams, URL } = require('url');
const fs = require('fs');

const { fetch_upload_data } = require('./utils');

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
  CI_REPOSITORY_URL,
  repo_token
} = process.env;

const IS_PR = CI_MERGE_REQUEST_ID;
const REF = CI_COMMIT_REF_NAME;
const HEAD_SHA = CI_COMMIT_SHA;
const USER_EMAIL = GITLAB_USER_EMAIL;
const USER_NAME = GITLAB_USER_NAME;

const TOKEN = repo_token || GITLAB_TOKEN;

const comment = async (opts) => {
  const { commit_sha, report } = opts;

  const endpoint = `${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/repository/commits/${commit_sha}/comments`;

  const body = new URLSearchParams();
  body.append('note', report);

  const headers = { 'PRIVATE-TOKEN': TOKEN };
  await fetch(endpoint, { method: 'POST', headers, body });
};

const get_runner_token = async () => {
  const endpoint = `${CI_API_V4_URL}/projects/${encodeURIComponent(
    CI_PROJECT_PATH
  )}`;

  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };
  const response = await fetch(endpoint, { method: 'GET', headers });
  const project = await response.json();

  return project.runners_token;
};

const register_runner = async (opts) => {
  const endpoint = `${CI_API_V4_URL}/runners`;

  const body = new URLSearchParams();
  body.append('token', opts.token);
  body.append('locked', 'true');
  body.append('run_untagged', 'true');
  body.append('access_level', 'not_protected');
  body.append('tag_list', opts.tags);

  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };
  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const runner = await response.json();

  return runner;
};

const upload = async (opts) => {
  const { path, buffer } = opts;
  const endpoint = `${CI_API_V4_URL}/projects/${CI_PROJECT_ID}/uploads`;

  const { headers: fetch_headers } = await fetch_upload_data({
    ...opts,
    file_var: 'filename'
  });
  const { 'Content-Type': mime, 'Content-length': size } = fetch_headers;

  const body = new FormData();
  body.append('file', path ? fs.createReadStream(path) : buffer);

  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };
  const response = await fetch(endpoint, { method: 'POST', headers, body });
  const { url } = await response.json();
  const { host } = new URL(CI_REPOSITORY_URL);

  return { uri: `${host}/${url}`, mime, size };
};

const handle_error = (e) => {
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
exports.upload = upload;
exports.handle_error = handle_error;

exports.CHECK_TITLE = 'CML Report';
