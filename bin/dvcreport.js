#!/usr/bin/env node

const yargs = require('yargs');
const { dvc_report } = require('../src/ci');
const { A_REV, B_REV } = require('../src/settings');

const run = async argv => {
  const { output, a_rev, b_rev, diff_target, metrics_diff_targets } = argv;

  await dvc_report({
    from: a_rev,
    to: b_rev,
    output,
    diff_target,
    metrics_diff_targets
  });
};

const argv = yargs
  .usage(
    `Usage: $0 --output <output folder> --a_rev defaults ${A_REV} --b_rev defaults ${B_REV}`
  )
  .example(
    `$0 -o myfolder --a_rev ${A_REV} --b_rev ${B_REV}`,
    'generates: myfolder/index.html'
  )
  .demandOption('output')
  .alias('o', 'output')
  .default('diff_target', '')
  .default('metrics_diff_targets', '')
  .array('metrics_diff_targets')
  .default('a_rev', A_REV)
  .default('b_rev', B_REV)
  .help('h')
  .alias('h', 'help').argv;

run(argv).catch(e => console.log(e));
