const { getInputArray, getInputBoolean } = require('./src/utils');
const DVC = require('./src/dvc');
const CI = require('./src/ci');
const Report = require('./src/report');
const {
  METRICS_FORMAT,
  BASELINE,
  DVC_TAG_PREFIX,
  REPRO_TARGETS,
  SKIP_PUSH
} = require('./src/settings');

const {
  git_fetch_all,
  check_ran_ref,
  handle_error,
  ref_parser,
  publish_report,
  is_pr,
  ref,
  head_sha,
  user_email,
  user_name,
  remote
} = process.env.GITHUB_ACTION
  ? require('./src/github')
  : require('./src/gitlab');

const run = async () => {
  const {
    baseline = BASELINE,
    metrics_format = METRICS_FORMAT,
    tag_prefix = DVC_TAG_PREFIX
  } = process.env;

  const repro_targets = getInputArray('repro_targets', REPRO_TARGETS);
  const metrics_diff_targets = getInputArray('metrics_diff_targets');
  const dvc_pull = getInputArray('dvc_pull');
  const skip_push = getInputBoolean('skip_push', SKIP_PUSH);

  Report.DVC_TAG_PREFIX = metrics_format;
  CI.DVC_TAG_PREFIX = tag_prefix;

  if (await CI.commit_skip_ci()) {
    console.log(`${CI.CI_SKIP_MESSAGE} found; skipping task`);
    return;
  }

  if (is_pr && (await check_ran_ref({ ref }))) {
    console.log(
      'This ref is running or has runned another check. Cancelling...'
    );
    return;
  }

  console.log('Fetch all history for all tags and branches');
  await git_fetch_all();

  await DVC.setup();
  await DVC.setup_remote({ dvc_pull });

  const repro_sha = await CI.run_dvc_repro_push({
    user_email,
    user_name,
    remote,
    ref,
    repro_targets,
    skip_push
  });

  console.log('Generating DVC Report');
  const to = repro_sha || head_sha;
  const dvc_report_out = await CI.dvc_report({
    from: baseline,
    to,
    metrics_diff_targets,
    ref_parser
  });

  console.log('Publishing Report');
  await publish_report({
    repro_sha,
    head_sha: repro_sha || head_sha,
    report: dvc_report_out.md
  });
};

run().catch(e => handle_error(e));
