const kebabcaseKeys = require('kebabcase-keys');

const { repoOptions } = require('../../../src/cml');

exports.command = 'create <markdown file>';
exports.description = 'Create a report';

exports.handler = async (opts) => {
  const { cml } = opts;
  console.log(await cml.commentCreate(opts));
};

exports.builder = (yargs) => yargs.env('CML_REPORT').options(exports.options);

exports.options = kebabcaseKeys({
  ...repoOptions,
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
  publish: {
    type: 'boolean',
    description: 'Upload local files and images linked from the Markdown report'
  },
  watch: {
    type: 'boolean',
    description: 'Watch for changes and automatically update the report'
  },
  triggerFile: {
    type: 'string',
    description: 'File used to trigger the watcher',
    hidden: true
  },
  native: {
    type: 'boolean',
    description:
      "Uses driver's native capabilities to upload assets instead of CML's storage. Not available on GitHub."
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
