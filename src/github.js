const { exec } = require('./utils');

const CI = require('./ci');
const core = require('@actions/core');
const github = require('@actions/github');

const {
  GITHUB_REPOSITORY,
  GITHUB_TOKEN,
  GITHUB_WORKFLOW,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_SHA,
  GITHUB_EVENT_NAME
} = process.env;

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const IS_PR = GITHUB_EVENT_NAME === 'pull_request';
const REF = IS_PR ? GITHUB_HEAD_REF : GITHUB_REF;
const HEAD_SHA = GITHUB_SHA;
const USER_EMAIL = 'action@github.com';
const USER_NAME = 'GitHub Action';
const REMOTE = `https://${owner}:${GITHUB_TOKEN}@github.com/${owner}/${repo}.git`;

const octokit = new github.GitHub(GITHUB_TOKEN);

const create_check_dvc_report = async opts => {
  const {
    head_sha,
    report,
    started_at = new Date(),
    completed_at = new Date(),
    conclusion = 'success',
    status = 'completed'
  } = opts;

  const title = CI.DVC_TITLE;
  const name = title;
  const check = await octokit.checks.create({
    owner,
    repo,
    head_sha,
    name,
    started_at,
    completed_at,
    conclusion,
    status,
    output: { title, summary: report }
  });

  return check;
};

const refParser = async ref => {
  const checks = await octokit.checks.listForRef({ owner, repo, ref });
  const check = checks.data.check_runs.filter(
    check => check.name === CI.DVC_TITLE
  )[0];

  if (check) return { label: ref.substr(0, 7), link: check.html_url };

  return ref;
};

const check_ran_ref = async opts => {
  const { ref } = opts;
  const checks = await octokit.checks.listForRef({ owner, repo, ref });

  return (
    checks.data.check_runs.filter(check => {
      return check.name.includes(`${GITHUB_WORKFLOW}`);
    }).length > 1
  );
};

const git_fetch_all = async () => {
  await exec('git fetch --prune --unshallow');
};

const publish_report = async opts => {
  await create_check_dvc_report(opts);
};

const handleError = e => {
  core.setFailed(e.message);
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
exports.refParser = refParser;
