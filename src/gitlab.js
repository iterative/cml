const { exec } = require('./utils');

const {
  CI_PROJECT_PATH,
  CI_COMMIT_REF_NAME,
  CI_COMMIT_SHA,
  // CI_COMMIT_BEFORE_SHA,
  GITLAB_TOKEN,
  GITLAB_USER_EMAIL,
  GITLAB_USER_NAME
} = process.env;

const [owner, repo] = CI_PROJECT_PATH.split('/');
const IS_PR = false;
const REF = CI_COMMIT_REF_NAME;
const HEAD_SHA = CI_COMMIT_SHA;
const USER_EMAIL = GITLAB_USER_EMAIL;
const USER_NAME = GITLAB_USER_NAME;
const REMOTE = `https://${owner}:${GITLAB_TOKEN}@gitlab.com/${owner}/${repo}.git`;

const check_ran_ref = async opts => {
  console.log('Not yet implemented.');
};

const git_fetch_all = async () => {
  await exec('git checkout -B "$CI_BUILD_REF_NAME" "$CI_BUILD_REF"');
  await exec('git fetch --prune');
};

const publish_report = async opts => {
  console.log('Not yet implemented.');
};

const handleError = e => {
  console.log(e.message);
  process.exit(1);
};

exports.is_pr = IS_PR;
exports.ref = REF;
exports.head_sha = HEAD_SHA;
exports.user_email = USER_EMAIL;
exports.user_name = USER_NAME;
exports.remote = REMOTE;
exports.check_ran_ref = check_ran_ref;
exports.git_fetch_all = git_fetch_all;
exports.publish_report = publish_report;
exports.handleError = handleError;
exports.refParser = null;
