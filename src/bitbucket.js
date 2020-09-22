const fetch = require('node-fetch');
const FormData = require('form-data');
const { URLSearchParams } = require('url');
const { fetch_upload_data } = require('./utils');

console.log(process.env);

const {
  BITBUCKET_REPO_FULL_NAME = '', //namespace with project name, i.e. elle/cml
  BITBUCKET_REPO_UUID, // UUID of project- string in {}
  BITBUCKET_BRANCH, // branch, cannot do build against tag
  BITBUCKET_TOKEN, // token, cannot do build against branch
  BITBUCKET_COMMIT, // SHA of commit
  BITBUCKET_PR_ID, // ID of merge request
  // GITLAB_USER_EMAIL, // doesn't look like email is part of BB env vars
  BITBUCKET_WORKSPACE, //username
  BITBUCKET_GIT_HTTP_ORIGIN, // url to project
  PIPELINES_JWT_TOKEN, // JWT TOKEN
  repo_token
} = process.env;

const IS_PR = BITBUCKET_PR_ID;
const REF = BITBUCKET_BRANCH || BITBUCKET_TOKEN;
const HEAD_SHA = BITBUCKET_COMMIT;
const USER_NAME = BITBUCKET_WORKSPACE;

const TOKEN = repo_token || $PIPELINES_JWT_TOKEN;

console.log(IS_PR)
console.log(REF)
console.log(HEAD_SHA)
console.log(USER_NAME)
console.log(TOKEN)