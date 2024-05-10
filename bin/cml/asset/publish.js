const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const { logger } = require('../../../src/logger');

const { CML } = require('../../../src/cml');

const DESCRIPTION = 'Publish an asset';
const DOCSURL = 'https://cml.dev/doc/usage#cml-reports';

exports.command = 'publish <asset>';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  if (opts.gitlabUploads) {
    logger.warn(
      '--gitlab-uploads will be deprecated soon, use --native instead'
    );
    opts.native = true;
  }

  const { file, asset: path } = opts;
  const cml = new CML({ ...opts });
  const output = await cml.publish({ ...opts, path });

  if (!file) console.log(output);
  else await fs.writeFile(file, output);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_ASSET')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  url: {
    type: 'string',
    description: 'Self-Hosted URL',
    hidden: true
  },
  md: {
    type: 'boolean',
    description: 'Output in markdown format [title || name](url)'
  },
  title: {
    type: 'string',
    alias: 't',
    description: 'Markdown title [title](url) or ![](url title)'
  },
  native: {
    type: 'boolean',
    description:
      "Uses driver's native capabilities to upload assets instead of CML's storage; not available on GitHub"
  },
  gitlabUploads: {
    type: 'boolean',
    hidden: true
  },
  rmWatermark: {
    type: 'boolean',
    description: 'Avoid CML watermark.',
    hidden: true,
    telemetryData: 'name'
  },
  mimeType: {
    type: 'string',
    defaultDescription: 'infer from the file contents',
    description: 'MIME type'
  },
  file: {
    type: 'string',
    alias: 'f',
    description:
      'Append the output to the given file or create it if does not exist',
    hidden: true
  },
  repo: {
    type: 'string',
    description:
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
  }
});
exports.DOCSURL = DOCSURL;
