const fetch = require('node-fetch');
const FormData = require('form-data');
const { URLSearchParams } = require('url');
const { fetch_upload_data } = require('./utils');

const {
  BITBUCKET_REPO_FULL_NAME = '', //namespace with project name, i.e. elle/cml
  BITBUCKET_REPO_UUID, // UUID of project- string in {}
  BITBUCKET_BRANCH, // branch, cannot do build against tag
  BITBUCKET_TOKEN, // token, cannot do build against branch
  BITBUCKET_COMMIT, // SHA of commit
  BITBUCKET_PR_ID, // ID of pull request- only available if build is triggered on PR
  // GITLAB_USER_EMAIL, // doesn't look like email is part of BB env vars
  BITBUCKET_WORKSPACE, //username
  BITBUCKET_GIT_HTTP_ORIGIN, // url to project
  BITBUCKET_REPO_SLUG, // repo slug
  repo_token
} = process.env;

const IS_PR = BITBUCKET_PR_ID;
const REF = BITBUCKET_BRANCH || BITBUCKET_TOKEN;
const TOKEN = repo_token;
const API = `https://https://api.bitbucket.org/2.0/`;

console.log(API)

const comment = async (opts) => {
  const { commit_sha, report } = opts;

  const endpoint = `/repositories/${BITBUCKET_WORKSPACE}/${BITBUCKET_REPO_SLUG}/commits/${BITBUCKET_COMMIT}/comments`;

  const body = new URLSearchParams();
  body.append('note', report);

  await bitbucket_request({ endpoint, method: 'POST', body });
};

const get_runner_token = async () => {
  const endpoint = `/projects/${encodeURIComponent(BITBUCKET_REPO_FULL_NAME)}`;
  const { runners_token } = await bitbucket_request({ endpoint });

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

  const data = await bitbucket_request({ endpoint, method: 'POST', body });

  return data;
};

const bitbucket_request = async (opts) => {
  const { endpoint, method = 'GET', body } = opts;

  if (!TOKEN) throw new Error('Gitlab API token not found');

  if (!endpoint) throw new Error('Gitlab API endpoint not found');

  const headers = { BITBUCKET_WORKSPACE : TOKEN, Accept: 'application/json' };
  const response = await fetch(`${API}${endpoint}`, {
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
exports.head_sha = BITBUCKET_COMMIT;
exports.user_name = BITBUCKET_WORKSPACE;
exports.comment = comment;
exports.get_runner_token = get_runner_token;
exports.register_runner = register_runner;
exports.handle_error = handle_error;
exports.token = TOKEN;
exports.repo = BITBUCKET_REPO_SLUG;

exports.CHECK_TITLE = 'CML Report';