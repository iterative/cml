const winston = require('winston');

// addDeprecationNotice adds middleware to the yargs chain to display a deprecation notice.
const addDeprecationNotice = (opts = {}) => {
  const { builder, notice } = opts;
  return (yargs) =>
    builder(yargs).middleware([(opts) => deprecationNotice(opts, notice)]);
};

const deprecationNotice = (opts, notice) => {
  const { cml } = opts;
  if (cml.driver.warn) {
    cml.driver.warn(notice);
  } else {
    winston.warn(notice);
  }
};

exports.addDeprecationNotice = addDeprecationNotice;
