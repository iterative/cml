#!/usr/bin/env node

console.log = console.error;

const DVC = require('../src/dvc');

const { handle_error } = process.env.GITHUB_ACTION
  ? require('../src/github')
  : require('../src/gitlab');

const run = async () => {
  await DVC.setup_credentials(process.env);
};

run().catch(e => handle_error(e));
