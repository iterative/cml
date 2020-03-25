const { git, exec } = require('./utils');
const path = require('path');
const fs = require('fs').promises;
const DVC = require('./dvc');
const Report = require('./report');

const { DVC_TITLE, DVC_TAG_PREFIX, CI_SKIP_MESSAGE } = require('./settings');

const dvc_tag_prefix = () => {
  return this.DVC_TAG_PREFIX;
};

const commit_skip_ci = async () => {
  const last_log = await exec('git log -1');
  return last_log.includes(CI_SKIP_MESSAGE);
};

const run_dvc_repro_push = async opts => {
  const { repro_targets, user_email, user_name, remote, ref } = opts;

  if (repro_targets === 'None') {
    console.log('DVC repro skipped by None');
    return false;
  }

  console.log(`Running dvc repro ${repro_targets}`);

  const dvc_repro = await DVC.repro({ targets: repro_targets });
  console.log(dvc_repro);

  const git_status = await git.status();
  if (!git_status.files.length) return;

  console.log('Updating remotes');
  await exec(`git config --local user.email "${user_email}"`);
  await exec(`git config --local user.name "${user_name}"`);
  await exec(`git remote add remote "${remote}"`, { throw_err: false });

  await exec(`git add --all`);
  await exec(`git commit -a -m "dvc repro ${CI_SKIP_MESSAGE}"`);

  const sha = (await exec(`git rev-parse HEAD`, { throw_err: false })).replace(
    /(\r\n|\n|\r)/gm,
    ''
  );
  const tag = sha_tag(sha);

  console.log('pushing');
  const tag_prefix = dvc_tag_prefix();
  const create_tag = tag_prefix && tag_prefix.length > 0;

  if (create_tag) await exec(`git tag ${tag}`, { throw_err: false });
  else
    console.log(
      "No tag prefix is set. Won't do tags. This makes experiments list not appear and may make reports not appear aswell"
    );

  await exec(`git push remote HEAD:${ref} --tags`, { throw_err: false });
  await exec('dvc push');

  return sha;
};

const other_experiments = async ref_parser => {
  const tag_prefix = dvc_tag_prefix();

  if (tag_prefix) {
    try {
      const logs = await git.log();
      const tags = logs.all.filter(log =>
        log.refs.startsWith(`tag: ${tag_prefix}`)
      );
      const refs = tags.map(tag => tag.hash).reverse();
      refs.pop();

      const others = refs;
      if (ref_parser) {
        for (let i = 0; i < others.length; i++) {
          others[i] = await ref_parser(others[i]);
        }
      }

      return others;
    } catch (err) {
      console.log(`Error while processing others: ${err.message}`);
    }
  }

  return [];
};

const dvc_report = async opts => {
  const { from, to, output, metrics_diff_targets, ref_parser } = opts;

  let dvc_diff = {};
  let dvc_metrics_diff = {};
  const others = await other_experiments(ref_parser);

  try {
    dvc_diff = await DVC.diff({ from, to });
  } catch (err) {
    console.log('Error while processing dvc diff');
    console.log(err);
  }

  try {
    dvc_metrics_diff = await DVC.metrics_diff({
      from,
      to,
      targets: metrics_diff_targets
    });
  } catch (err) {
    console.log('Error while processing dvc metrics diff');
    console.log(err);
  }

  const sha_from = await git.revparse([from]);
  const sha_to = await git.revparse([to]);
  const no_tag = !(dvc_tag_prefix() && dvc_tag_prefix().length);
  const md = await Report.dvc_report_md({
    from,
    to,
    sha_from,
    sha_to,
    dvc_diff,
    dvc_metrics_diff,
    others,
    no_tag
  });
  const html = Report.md_to_html(md);

  if (opts.output) {
    await fs.mkdir(output, { recursive: true });
    await fs.writeFile(path.join(output, 'index.html'), html);
    await fs.copyFile(
      path.join(__dirname, '../assets', 'report.css'),
      path.join(output, 'report.css')
    );
  }

  return { dvc_diff, dvc_metrics_diff, others, md, html };
};

const sha_tag = sha => {
  if (!sha) return null;

  return `${dvc_tag_prefix()}${sha.slice(0, 7)}`;
};

exports.DVC_TITLE = DVC_TITLE;
exports.DVC_TAG_PREFIX = DVC_TAG_PREFIX;
exports.CI_SKIP_MESSAGE = CI_SKIP_MESSAGE;
exports.commit_skip_ci = commit_skip_ci;
exports.run_dvc_repro_push = run_dvc_repro_push;
exports.other_experiments = other_experiments;
exports.dvc_report = dvc_report;
exports.sha_tag = sha_tag;
