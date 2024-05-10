const { logger } = require('./logger');

const SEPARATOR = '/';

async function parseCommentTarget(opts = {}) {
  const { commitSha: commit, pr, target, drv } = opts;

  let commentTarget = target;
  // Handle legacy comment target flags.
  if (commit) {
    drv.warn(
      `Deprecation warning: use --target="commit${SEPARATOR}<sha>" instead of --commit-sha=<sha>`
    );
    commentTarget = `commit${SEPARATOR}${commit}`;
  }
  if (pr) {
    drv.warn('Deprecation warning: use --target=pr instead of --pr');
    commentTarget = 'pr';
  }
  // Handle comment targets that are incomplete, e.g. 'pr' or 'commit'.
  let prNumber;
  let commitPr;
  switch (commentTarget.toLowerCase()) {
    case 'commit':
      logger.debug(`Comment target "commit" mapped to "commit/${drv.sha}"`);
      return { target: 'commit', commitSha: drv.sha };
    case 'pr':
    case 'auto':
      // Determine PR id from forge env vars (if we're in a PR context).
      prNumber = drv.pr;
      if (prNumber) {
        logger.debug(
          `Comment target "${commentTarget}" mapped to "pr/${prNumber}"`
        );
        return { target: 'pr', prNumber: prNumber };
      }
      // Or fallback to determining PR by HEAD commit.
      // TODO: handle issue with PR HEAD commit not matching source branch in github.
      [commitPr = {}] = await drv.commitPrs({ commitSha: drv.sha });
      if (commitPr.url) {
        [prNumber] = commitPr.url.split('/').slice(-1);
        logger.debug(
          `Comment target "${commentTarget}" mapped to "pr/${prNumber}" based on commit "${drv.sha}"`
        );
        return { target: 'pr', prNumber };
      }
      // If target is 'auto', fallback to issuing commit comments.
      if (commentTarget === 'auto') {
        logger.debug(
          `Comment target "${commentTarget}" mapped to "commit/${drv.sha}"`
        );
        return { target: 'commit', commitSha: drv.sha };
      }
      throw new Error(`PR for commit sha "${drv.sha}" not found`);
  }
  // Handle qualified comment targets, e.g. 'issue/id'.
  const separatorPos = commentTarget.indexOf(SEPARATOR);
  if (separatorPos === -1) {
    throw new Error(`Failed to parse comment --target="${commentTarget}"`);
  }
  const targetType = commentTarget.slice(0, separatorPos);
  const id = commentTarget.slice(separatorPos + 1);
  switch (targetType.toLowerCase()) {
    case 'commit':
      return { target: targetType, commitSha: id };
    case 'pr':
      return { target: targetType, prNumber: id };
    case 'issue':
      return { target: targetType, issueId: id };
    default:
      throw new Error(`unsupported comment target "${commentTarget}"`);
  }
}

module.exports = { parseCommentTarget };
