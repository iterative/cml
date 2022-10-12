const winston = require('winston');

// deprecationNotice adds middleware to the yargs chain to display a deprecation notice.
const deprecationNotice = (opts = {}) => {
  const { builder, notice } = opts;
  return (yargs) => builder(yargs).middleware([(argv) => winston.warn(notice)]);
};

exports.deprecationNotice = deprecationNotice;
