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

const USERNAME = BITBUCKET_WORKSPACE
const IS_PR = BITBUCKET_PR_ID;
const REF = BITBUCKET_BRANCH || BITBUCKET_TOKEN;
const PASSWORD = repo_token;
const API_URL = `https://https://api.bitbucket.org/2.0/`;

const comment = async (opts) => {
  const { commit_sha, report } = opts;

  const endpoint = `/repositories/${USERNAME}/${BITBUCKET_REPO_SLUG}/commits/${BITBUCKET_COMMIT}/comments`;

  const body = new URLSearchParams();
  body.append('raw', report);

  await bitbucket_request({ endpoint, method: 'POST', body });
};

const get_runner_token = async () => {
  const endpoint = `/projects/${encodeURIComponent(BITBUCKET_REPO_FULL_NAME)}`;
  const { runners_token } = await bitbucket_request({ endpoint });

  return runners_token;
};

const bitbucket_request = async (opts) => {
  const { endpoint, method = 'GET', body } = opts;

  if (!TOKEN) throw new Error('BitBucket password not found');

  if (!endpoint) throw new Error('BitBucket API endpoint not found');

  const headers = {'Authorization': `Basic ${ encode(`${USERNAME}:${TOKEN}`) }`, 
                    Accept: 'application/json' };
  const response = await fetch(`${API_URL}${endpoint}`, {
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
exports.user_name = USERNAME;
exports.comment = comment;
exports.get_runner_token = get_runner_token;
exports.handle_error = handle_error;
exports.token = PASSWORD;
exports.repo = BITBUCKET_REPO_SLUG;

exports.CHECK_TITLE = 'CML Report';