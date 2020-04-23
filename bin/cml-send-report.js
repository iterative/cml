#!/usr/bin/env node

const {
  send_report_args,
  send_report_run,
  error_handler
} = require('../src/cml');

const opts = send_report_args();
send_report_run(opts).catch(e => error_handler(e));
