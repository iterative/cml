const kebabcaseKeys = require('kebabcase-keys');

exports.command = 'create <markdown file>';
exports.description = 'Create a comment';

exports.handler = async (opts) => {
  const { cml } = opts;
  console.log(await cml.commentCreate(opts));
};

exports.builder = (yargs) =>
  yargs
    .env('CML_COMMENT')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
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
    default: true,
    description: 'Upload any local images found in the Markdown report'
  },
  publishUrl: {
    type: 'string',
    default: 'https://asset.cml.dev',
    description: 'Self-hosted image server URL',
    telemetryData: 'name'
  },
  watch: {
    type: 'boolean',
    description: 'Watch for changes and automatically update the comment'
  },
  triggerFile: {
    type: 'string',
    description: 'File used to trigger the watcher',
    hidden: true
  },
  native: {
    type: 'boolean',
    description:
      "Uses driver's native capabilities to upload assets instead of CML's storage; not available on GitHub",
    telemetryData: 'name'
  },
  update: {
    type: 'boolean',
    description:
      'Update the last CML comment (if any) instead of creating a new one',
    hidden: true
  },
  rmWatermark: {
    type: 'boolean',
    description:
      'Avoid watermark; CML needs a watermark to be able to distinguish CML comments from others',
    telemetryData: 'name'
  },
  watermarkTitle: {
    type: 'string',
    description:
      'Hidden comment marker (used for targeting in subsequent `cml comment update`); "{workflow}" & "{run}" are auto-replaced',
    default: '',
    conflicts: ['rmWatermark']
  }
});
