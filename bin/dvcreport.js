#!/usr/bin/env node

const yargs = require('yargs');

const { dvc_report } = require('../src/ci');

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
    'Usage: $0 --output <output folder> --a_rev old defaults HEAD --b_rev new defaults current without commit'
  )
  .example(
    '$0 -o myfolder --a_rev HEAD --a_rev HEAD^1',
    'generates: myfolder/index.html'
  )
  .demandOption('output')
  .alias('o', 'output')
  .default('diff_target', '')
  .default('metrics_diff_targets', '')
  .array('metrics_diff_targets')
  .default('a_rev', '')
  .default('b_rev', '')
  .help('h')
  .alias('h', 'help').argv;

run(argv).catch(e => console.log(e));
