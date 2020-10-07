const fetch = require('node-fetch');
const FormData = require('form-data');
const { URLSearchParams } = require('url');

const { fetch_upload_data } = require('./utils');

const {
  CI_API_V4_URL,
  CI_PROJECT_PATH = '',
  CI_PROJECT_ID,
  CI_COMMIT_REF_NAME,
  CI_COMMIT_SHA,
  CI_MERGE_REQUEST_ID,
  CI_PROJECT_URL,
  GITLAB_USER_EMAIL,
  GITLAB_USER_NAME,
  GITLAB_TOKEN,
  repo_token
} = process.env;

const IS_PR = CI_MERGE_REQUEST_ID;
const REF = CI_COMMIT_REF_NAME;
const HEAD_SHA = CI_COMMIT_SHA;
const USER_EMAIL = GITLAB_USER_EMAIL;
const USER_NAME = GITLAB_USER_NAME;

const TOKEN = repo_token || GITLAB_TOKEN;
const REPO = CI_PROJECT_URL;

const commit_comments = async (opts) => {
  const { commit_sha } = opts;

  const endpoint = `/projects/:${CI_PROJECT_ID}/repository/commits/${commit_sha}/comments`;
  const comments = await gitlab_request({ endpoint, method: 'POST' });

  return comments.map((comment) => {
    const {
      id,
      author: { username: user_name },
      note: body,
      created_at
    } = comment;

    return { id, user_name, body, created_at, updated_at: created_at };
  });
};

const pull_request_comments = async (opts) => {
  const { pr } = opts;
  const comments = [];

  const endpoint = `/projects/${CI_PROJECT_ID}/merge_requests/${pr}/context_commits`;
  const { commits } = await gitlab_request({ endpoint, method: 'POST' });

  for (let i = 0; i < commits.length; i++) {
    const { sha: commit_sha } = commits[i];
    const c_comments = await commit_comments({
      commit_sha
    });

    comments.concat(c_comments);
  }

  return comments;
};

const comment = async (opts) => {
  const { commit_sha, report } = opts;

  const endpoint = `/projects/${CI_PROJECT_ID}/repository/commits/${commit_sha}/comments`;

  const body = new URLSearchParams();
  body.append('note', report);

  await gitlab_request({ endpoint, method: 'POST', body });
};

const get_runner_token = async () => {
  const endpoint = `/projects/${encodeURIComponent(CI_PROJECT_PATH)}`;
  const { runners_token } = await gitlab_request({ endpoint });

  return runners_token;
};

const register_runner = async (opts) => {
  const endpoint = `/runners`;

  const body = new URLSearchParams();
  body.append('token', opts.token);
  body.append('locked', 'true');
  body.append('run_untagged', 'true');
  body.append('access_level', 'not_protected');
  body.append('tag_list', opts.tags);

  const data = await gitlab_request({ endpoint, method: 'POST', body });

  return data;
};

const upload = async (opts) => {
  const endpoint = `/projects/${CI_PROJECT_ID}/uploads`;

  const { size, mime, data } = await fetch_upload_data(opts);
  const body = new FormData();
  body.append('file', data);

  const { url } = await gitlab_request({ endpoint, method: 'POST', body });

  return { uri: `${CI_PROJECT_URL}${url}`, mime, size };
};

const gitlab_request = async (opts) => {
  const { endpoint, method = 'GET', body } = opts;

  if (!TOKEN) throw new Error('Gitlab API token not found');

  if (!CI_API_V4_URL) throw new Error('Gitlab API url not found');

  if (!endpoint) throw new Error('Gitlab API endpoint not found');

  const headers = { 'PRIVATE-TOKEN': TOKEN, Accept: 'application/json' };
  const response = await fetch(`${CI_API_V4_URL}${endpoint}`, {
    method,
    headers,
    body
  });
  const json = await response.json();

  console.log(json);

  return json;
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
exports.token = TOKEN;
exports.repo = REPO;

exports.commit_comments = commit_comments;
exports.pull_request_comments = pull_request_comments;
exports.comment = comment;
exports.get_runner_token = get_runner_token;
exports.register_runner = register_runner;
exports.upload = upload;
exports.handle_error = handle_error;

exports.CHECK_TITLE = 'CML Report';
