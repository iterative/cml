const core = require('@actions/core');
const github = require('@actions/github');

const { exec } = require('./src/utils');
const DVC = require('./src/dvc');
const CI = require('./src/ci');

const Report = require('./src/report');
Report.METRICS_FORMAT = core.getInput('metrics_format');

const {
  GITHUB_REPOSITORY,
  GITHUB_EVENT_NAME,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_SHA,
  GITHUB_WORKFLOW
} = process.env;

const GITHUB_TOKEN = core.getInput('github_token');
const octokit = new github.GitHub(GITHUB_TOKEN);
const [owner, repo] = GITHUB_REPOSITORY.split('/');

const getInputArray = key => {
  return core.getInput(key) ? core.getInput(key).split(/[ ,]+/) : [];
};

const refParser = async ref => {
  const checks = await octokit.checks.listForRef({ owner, repo, ref });
  const check = checks.data.check_runs.filter(
    check => check.name === CI.DVC_TITLE
  )[0];

  if (check) return { label: ref.substr(0, 7), link: check.html_url };

  return ref;
};

const check_action_ran_ref = async opts => {
  const { owner, repo, ref } = opts;
  const checks = await octokit.checks.listForRef({ owner, repo, ref });

  return (
    checks.data.check_runs.filter(check => {
      return check.name.includes(`${GITHUB_WORKFLOW}`);
    }).length > 1
  );
};

const create_check_dvc_report = async opts => {
  const {
    owner,
    repo,
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

const run = async () => {
  const is_pr = GITHUB_EVENT_NAME === 'pull_request';
  const ref = is_pr ? GITHUB_HEAD_REF : GITHUB_REF;
  const head_sha = GITHUB_SHA;

  const user_email = 'action@github.com';
  const user_name = 'GitHub Action';
  const remote = `https://${owner}:${GITHUB_TOKEN}@github.com/${owner}/${repo}.git`;

  const dvc_pull = core.getInput('dvc_pull');
  const repro_targets = getInputArray('repro_targets');
  const metrics_diff_targets = getInputArray('metrics_diff_targets');

  console.log('Fetching...');
  await exec('git fetch --prune --unshallow');

  if (await CI.commit_skip_ci()) {
    console.log(`${CI.SKIP} found; skipping task`);
    return;
  }

  if (is_pr && (await check_action_ran_ref({ owner, repo, ref }))) {
    console.log(
      'This ref is running or has runned another check. Cancelling...'
    );
    return;
  }

  await DVC.setup();
  await DVC.init_remote({ dvc_pull });

  const repro_ran = await CI.run_dvc_repro_push({
    user_email,
    user_name,
    remote,
    ref,
    repro_targets
  });

  console.log('Generating Dvc Report');
  const from = core.getInput('rev');
  const to = repro_ran || '';
  const dvc_report_out = await CI.dvc_report({
    from,
    to,
    metrics_diff_targets,
    refParser
  });

  console.log('Creating Check');
  await create_check_dvc_report({
    owner,
    repo,
    head_sha: repro_ran || head_sha,
    report: dvc_report_out.md
  });
};

run().catch(e => core.setFailed(e.message));
