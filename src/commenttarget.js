const SEPARATOR = '#';

async function parseCommentTarget(opts = {}) {
  const { commitSha: commit, issue, pr, target, drv } = opts;

  let commentTarget = target;
  // Handle legacy comment target flags.
  if (issue) {
    drv.warn(
      'cml: the --issue flag will be deprecated, please use --target="issue#123"'
    );
    commentTarget = `issue#${issue}`;
  }
  if (commit) {
    drv.warn(
      'cml: the --commitSha flag will be deprecated, please use --target="commit#<sha>"'
    );
    commentTarget = `commit#${commit}`;
  }
  if (pr) {
    drv.warn('cml: the --pr flag will be deprecated, please use --target="pr"');
    commentTarget = 'pr';
  }
  // Handle comment targets that are incomplete, e.g. 'pr' or 'commit'.
  let prId;
  let commitPr;
  switch (commentTarget) {
    case 'commit':
      return { target: 'commit', commitSha: drv.sha };
    case 'pr':
    case 'auto':
      // Determine PR id from forge env vars (if we're in a PR context).
      prId = drv.pr;
      if (prId) {
        return { target: 'pr', prNumber: prId };
      }
      // Or fallback to determining PR by HEAD commit.
      // TODO: handle issue with PR HEAD commit not matching source branch in github.
      [commitPr = {}] = await drv.commitPrs({ commitSha: drv.sha });
      if (commitPr.url) {
        [prId] = commitPr.url.split('/').slice(-1);
        return { target: 'pr', prNumber: prId };
      }
      // If target is 'auto', fallback to issuing commit comments.
      if (commentTarget === 'auto') {
        return { target: 'commit', commitSha: drv.sha };
      }
      throw new Error(`PR for commit sha "${drv.sha}" not found`);
  }
  // Handle qualified comment targets, e.g. 'issue#id'.
  const separatorPos = commentTarget.indexOf(SEPARATOR);
  if (separatorPos === -1) {
    throw new Error(`comment target "${commentTarget}" could not be parsed`);
  }
  const targetType = commentTarget.slice(0, separatorPos);
  const id = commentTarget.slice(separatorPos + 1);
  switch (targetType) {
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
