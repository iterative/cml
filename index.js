const DVC = require('./src/dvc');
const CI = require('./src/ci');
const Report = require('./src/report');
const {
  METRICS_FORMAT,
  BASELINE,
  DVC_PULL,
  REPRO_TARGETS,
  METRICS_DIFF_TARGETS
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

const getInputArray = (key, default_value) => {
  return process.env[key]
    ? process.env[key].split(/[ ,]+/)
    : default_value || [];
};

const run = async () => {
  const {
    baseline = BASELINE,
    metrics_format = METRICS_FORMAT,
    dvc_pull = DVC_PULL
  } = process.env;

  const repro_targets = getInputArray('repro_targets', REPRO_TARGETS);
  const metrics_diff_targets = getInputArray(
    'metrics_diff_targets',
    METRICS_DIFF_TARGETS
  );

  Report.METRICS_FORMAT = metrics_format;

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
    repro_targets
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
