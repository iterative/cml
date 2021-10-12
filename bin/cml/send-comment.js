const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');

const CML = require('../../src/cml').default;

exports.command = 'send-comment <markdown file>';
exports.description = 'Comment on a commit';

exports.handler = async (opts) => {
  const path = opts.markdownfile;
  const report = await fs.readFile(path, 'utf-8');
  const cml = new CML(opts);
  console.log(await cml.commentCreate({ ...opts, report }));
};

exports.builder = (yargs) =>
  yargs.env('CML_SEND_COMMENT').options(
    kebabcaseKeys({
      commitSha: {
        type: 'string',
        alias: 'head-sha',
        description: 'Commit SHA linked to this comment. Defaults to HEAD.'
      },
      update: {
        type: 'boolean',
        description:
          'Update the last CML comment (if any) instead of creating a new one'
      },
      rmWatermark: {
        type: 'boolean',
        description:
          'Avoid watermark. CML needs a watermark to be able to distinguish CML reports from other comments in order to provide extra functionality.'
      },
      repo: {
        type: 'string',
        description:
          'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab', 'bitbucket'],
        description: 'If not specify it infers it from the ENV.'
      }
    })
  );
