const logger = require('winston');

const setupLogger = (opts) => {
  const { log: level, silent } = opts;

  logger.configure({
    format: process.stdout.isTTY
      ? logger.format.combine(
          logger.format.colorize({ all: true }),
          logger.format.simple()
        )
      : logger.format.combine(
          logger.format.errors({ stack: true }),
          logger.format.json()
        ),
    transports: [
      new logger.transports.Console({
        stderrLevels: Object.keys(logger.config.npm.levels),
        handleExceptions: true,
        handleRejections: true,
        level,
        silent
      })
    ]
  });
};

if (typeof jest !== 'undefined') {
  setupLogger({ log: 'debug', silent: true });
}

module.exports = { logger, setupLogger };
