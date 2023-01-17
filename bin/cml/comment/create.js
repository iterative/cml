const kebabcaseKeys = require('kebabcase-keys');

const DESCRIPTION = 'Create a comment';
const DOCSURL = 'https://cml.dev/doc/ref/comment#create';

exports.command = 'create <markdown file>';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

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
  target: {
    type: 'string',
    description:
      'Comment type (`commit`, `pr`, `commit/f00bar`, `pr/42`, `issue/1337`),' +
      'default is automatic (`pr` but fallback to `commit`).'
  },
  pr: {
    type: 'boolean',
    description:
      'Post to an existing PR/MR associated with the specified commit',
    conflicts: ['target', 'commitSha'],
    hidden: true
  },
  commitSha: {
    type: 'string',
    alias: 'head-sha',
    description: 'Commit SHA linked to this comment',
    conflicts: ['target', 'pr'],
    hidden: true
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
  publishNative: {
    type: 'boolean',
    alias: 'native',
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
    hidden: true,
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
exports.DOCSURL = DOCSURL;
