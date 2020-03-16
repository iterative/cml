const DVC = require('./src/dvc');
const CI = require('./src/ci');
const Report = require('./src/report');

const {
  git_fetch_all,
  check_ran_ref,
  handleError,
  refParser,
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
    dvc_pull = true,
    from = 'origin/master',
    metrics_format = '0[.][0000000]'
  } = process.env;

  Report.METRICS_FORMAT = metrics_format;

  const repro_targets = getInputArray('repro_targets', ['Dvcfile']);
  const metrics_diff_targets = getInputArray('metrics_diff_targets');

  if (await CI.commit_skip_ci()) {
    console.log(`${CI.SKIP} found; skipping task`);
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

  const repro_ran = await CI.run_dvc_repro_push({
    user_email,
    user_name,
    remote,
    ref,
    repro_targets
  });

  console.log('Generating DVC Report');
  const to = repro_ran || '';
  const dvc_report_out = await CI.dvc_report({
    from,
    to,
    metrics_diff_targets,
    refParser
  });

  console.log('Publishing Report ');
  await publish_report({
    head_sha: repro_ran || head_sha,
    report: dvc_report_out.md
  });
};

run().catch(e => handleError(e));
