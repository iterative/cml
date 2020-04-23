#!/usr/bin/env node

const { metrics_args, diff_run, error_handler } = require('../src/cml');
const opts = metrics_args();
diff_run(opts).catch(e => error_handler(e));
