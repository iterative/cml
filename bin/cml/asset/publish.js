const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const winston = require('winston');

const { CML } = require('../../../src/cml');

exports.command = 'publish <asset>';
exports.description = 'Publish an asset';

exports.handler = async (opts) => {
  if (opts.gitlabUploads) {
    winston.warn(
      '--gitlab-uploads will be deprecated soon, use --native instead'
    );
    opts.native = true;
  }

  // const { file, repo, native, asset: path } = opts;
  const { file, asset: path } = opts;
  // const cml = new CML({ ...opts, repo: native ? repo : 'cml' });
  const cml = new CML({ ...opts });
  const output = await cml.publish({ ...opts, path });

  if (!file) console.log(output);
  else await fs.writeFile(file, output);
};

exports.builder = (yargs) => yargs.env('CML_ASSET').options(exports.options);

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
    description: 'Avoid CML watermark.'
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
