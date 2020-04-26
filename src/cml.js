const print = console.log;
// console.log = console.error;

const fs = require('fs').promises;
const pipe_args = require('../src/pipe-args');
const yargs = require('yargs');

const { head_sha, git_fetch_all, publish_report, handle_error } = process.env
  .GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const DVC = require('./dvc');
const REPORT = require('./report');

module.exports.print = print;
module.exports.metrics_args = () => {
  pipe_args.load();
  const argv = yargs
    .usage(`Usage: $0 --metrics <json> --file <string>`)
    .default('metrics', pipe_args.piped_arg())
    .alias('m', 'metrics')
    .default('file')
    .alias('f', 'file')
    .default('maxchars', 20000)
    .alias('c', 'maxchars')
    .help('h').argv;

  return argv;
};

module.exports.metrics_diff_run = async opts => {
  await this.metrics_run({
    ...opts,
    handler: REPORT.dvc_metrics_diff_report_md
  });
};

module.exports.diff_run = async opts => {
  await this.metrics_run({ ...opts, handler: REPORT.dvc_diff_report_md });
};

module.exports.metrics_run = async opts => {
  const { metrics = '{}', file, maxchars, handler } = opts;

  const metrics_parsed = JSON.parse(metrics);
  const output = handler(metrics_parsed, maxchars);

  if (!file) print(output);
  else await fs.writeFile(file, output);
};

module.exports.send_report_args = () => {
  pipe_args.load();
  const argv = yargs
    .usage(`Usage: $0 --path <string>`)
    .default('path')
    .alias('p', 'path')
    .default('head_sha', head_sha)
    .help('h')
    .demandOption(['path']).argv;

  return argv;
};

module.exports.send_report_run = async opts => {
  const { path, head_sha } = opts;
  const report = await fs.readFile(path, 'utf-8');

  await publish_report({
    head_sha,
    report
  });
};

module.exports.setup = async () => {
  print('Fetch all history for all tags and branches');
  await git_fetch_all();

  await DVC.setup_credentials(process.env);
};

module.exports.error_handler = handle_error;
