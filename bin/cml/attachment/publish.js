const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const winston = require('winston');

const CML = require('../../../src/cml').default;

exports.command = 'publish <asset>';
exports.description = 'publish an asset';

exports.handler = async (opts) => {
  if (opts.gitlabUploads) {
    winston.warn(
      '--gitlab-uploads will be deprecated soon. Use --native instead.'
    );
    opts.native = true;
  }

  const { file, repo, native } = opts;

  const path = opts.asset;
  const cml = new CML({ ...opts, repo: native ? repo : 'cml' });

  const output = await cml.publish({
    ...opts,
    path
  });

  if (!file) console.log(output);
  else await fs.writeFile(file, output);
};

exports.builder = (yargs) => yargs.env('CML_PUBLISH').options(exports.options);

exports.options = kebabcaseKeys({
  md: {
    type: 'boolean',
    description: 'Output in markdown format [title || name](url).'
  },
  title: {
    type: 'string',
    alias: 't',
    description: 'Markdown title [title](url) or ![](url title).'
  },
  native: {
    type: 'boolean',
    description:
      "Uses driver's native capabilities to upload assets instead of CML's storage. Not available on GitHub."
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
    description:
      'Specifies the mime-type. If not set guess it from the content.'
  },
  file: {
    type: 'string',
    alias: 'f',
    description:
      'Append the output to the given file. Create it if does not exist.',
    hidden: true
  }
});
