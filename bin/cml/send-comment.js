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

exports.builder = (yargs) => yargs.env('CML_SEND_COMMENT').options(options);

const options = kebabcaseKeys({
  pr: {
    type: 'boolean',
    description:
      'Post to an existing PR/MR associated with the specified commit'
  },
  commitSha: {
    type: 'string',
    alias: 'head-sha',
    default: 'HEAD',
    description: 'Commit SHA linked to this comment'
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
  }
});
