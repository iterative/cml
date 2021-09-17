const fs = require('fs').promises;

const CML = require('../../src/cml').default;

exports.command = 'send-comment <markdown file>';
exports.desc = 'Comment on a commit';

exports.handler = async (opts) => {
  const path = opts.markdownfile;
  const report = await fs.readFile(path, 'utf-8');
  const cml = new CML(opts);
  console.log(await cml.commentCreate({ ...opts, report }));
};

exports.builder = (yargs) =>
  yargs
    .default('commit-sha')
    .describe(
      'commit-sha',
      'Commit SHA linked to this comment. Defaults to HEAD.'
    )
    .alias('commit-sha', 'head-sha')
    .boolean('update')
    .describe(
      'update',
      'Update the last CML comment (if any) instead of creating a new one'
    )
    .boolean('rm-watermark')
    .describe(
      'rm-watermark',
      'Avoid watermark. CML needs a watermark to be able to distinguish CML reports from other comments in order to provide extra functionality.'
    )
    .default('repo')
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token')
    .describe(
      'token',
      'Personal access token to be used. If not specified is extracted from ENV REPO_TOKEN.'
    )
    .default('driver')
    .choices('driver', ['github', 'gitlab', 'bitbucket'])
    .describe('driver', 'If not specify it infers it from the ENV.');
