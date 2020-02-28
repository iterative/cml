const { git, exec, fs, path } = require('./utils');
const DVC = require('./Dvc');
const Report = require('./Report');

const DVC_TITLE = 'Dvc Report';
const DVC_TAG_PREFIX = 'dvc_';
const SKIP = '[ci skip]';

const commit_skip_ci = async () => {
  const last_log = await exec('git log -1');
  console.log(last_log);
  return last_log.includes(SKIP);
};

const run_dvc_repro = async opts => {
  const { repro_targets, user_email, user_name, remote, ref } = opts;

  if (repro_targets === 'None') {
    console.log('DVC repro skipped by None');
    return false;
  }

  console.log(`Running dvc repro ${repro_targets}`);

  const dvc_repro = await DVC.repro({ targets: repro_targets });
  console.log(dvc_repro);

  const repro_ran = !dvc_repro.includes('pipelines are up to date');
  if (!repro_ran) return;

  console.log('Updating remotes');
  await exec(`git config --local user.email "${user_email}"`);
  await exec(`git config --local user.name "${user_name}"`);
  await exec(`git remote add remote "${remote}"`, { throw_err: false });

  await exec(`git add --all`);
  await exec(`git commit -a -m "dvc repro ${SKIP}"`);
  await exec('dvc commit');

  const sha = (await exec(`git rev-parse HEAD`, { throw_err: false })).replace(
    /(\r\n|\n|\r)/gm,
    ''
  );
  const tag = `${DVC_TAG_PREFIX}${sha.slice(0, 7)}`;

  console.log('pushing');
  await exec(`git tag ${tag}`, { throw_err: false });
  await exec(`git push remote HEAD:${ref} --tags`, { throw_err: false });
  await exec('dvc push');

  return sha;
};

const dvc_report = async opts => {
  const { from, to, output, metrics_diff_targets, refParser } = opts;

  const dvc_diff = await DVC.diff({ from, to });
  const dvc_metrics_diff = await DVC.metrics_diff({
    from,
    to,
    targets: metrics_diff_targets
  });

  const logs = await git.log();
  const tags = logs.all.filter(log => log.refs.includes(`${DVC_TAG_PREFIX}`));
  const refs = tags.map(tag => tag.hash).reverse();
  refs.pop();

  const others = refs;
  if (refParser) {
    for (let i = 0; i < others.length; i++) {
      others[i] = await refParser(others[i]);
    }
  }

  const md = await Report.dvc_report_md({ dvc_diff, dvc_metrics_diff, others });
  const html = Report.md_to_html(md);

  if (opts.output) {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'index.html'), html);
    await fs.copyFile(
      path.join(__dirname, '../assets', 'report.css'),
      path.join(output, 'report.css')
    );
    await fs.copyFile(
      path.join(__dirname, '../assets', 'showdown.min.js'),
      path.join(output, 'showdown.min.js')
    );
  }

  return { dvc_diff, dvc_metrics_diff, others, md, html };
};

exports.DVC_TITLE = DVC_TITLE;
exports.SKIP = SKIP;
exports.commit_skip_ci = commit_skip_ci;
exports.run_dvc_repro = run_dvc_repro;
exports.dvc_report = dvc_report;
