const core = require('@actions/core');
const github = require('@actions/github');
const { request } = require('@octokit/request');

const {
  GITHUB_REPOSITORY = '',
  GITHUB_JOB,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_SHA,
  GITHUB_EVENT_NAME,
  GITHUB_TOKEN,
  repo_token
} = process.env;

const [owner, repo] = GITHUB_REPOSITORY.split('/');
const IS_PR = GITHUB_EVENT_NAME === 'pull_request';
const REF = IS_PR ? GITHUB_HEAD_REF : GITHUB_REF;
const HEAD_SHA = GITHUB_SHA;
const USER_EMAIL = 'action@github.com';
const USER_NAME = 'GitHub Action';

const TOKEN = repo_token || GITHUB_TOKEN;
const REMOTE = `https://${owner}:${TOKEN}@github.com/${owner}/${repo}.git`;

const octokit = new github.GitHub(TOKEN);

const DVC_TITLE = 'DVC Report';

const create_check_dvc_report = async opts => {
  const {
    head_sha,
    report,
    started_at = new Date(),
    completed_at = new Date(),
    conclusion = 'success',
    status = 'completed'
  } = opts;

  const title = DVC_TITLE;
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

const ref_parser = async ref => {
  const checks = await octokit.checks.listForRef({ owner, repo, ref });
  const check = checks.data.check_runs.filter(
    check => check.name === DVC_TITLE
  )[0];

  if (check) return { label: ref.substr(0, 7), link: check.html_url };

  return ref;
};

const check_ran_ref = async opts => {
  const { ref } = opts;
  const checks = await octokit.checks.listForRef({ owner, repo, ref });

  return (
    checks.data.check_runs.filter(check => {
      return check.name.includes(`${GITHUB_JOB}`);
    }).length > 1
  );
};

const publish_report = async opts => {
  await create_check_dvc_report(opts);

  const { head_sha, report } = opts;

  await request(
    `POST /repos/${GITHUB_REPOSITORY}/commits/${head_sha}/comments`,
    {
      headers: { authorization: `token ${TOKEN}` },
      body: report
    }
  );
};

const handle_error = e => {
  core.setFailed(e.message);
};

exports.is_pr = IS_PR;
exports.ref = REF;
exports.head_sha = HEAD_SHA;
exports.user_email = USER_EMAIL;
exports.user_name = USER_NAME;
exports.remote = REMOTE;
exports.ref_parser = ref_parser;
exports.check_ran_ref = check_ran_ref;
exports.publish_report = publish_report;
exports.handle_error = handle_error;
