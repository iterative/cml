const fs = require('fs').promises;
const kebabcaseKeys = require('kebabcase-keys');
const winston = require('winston');

const CML = require('../../src/cml').default;

exports.command = 'publish <asset>';
exports.description = 'Upload an image to build a report';

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

exports.builder = (yargs) =>
  yargs.env('CML_PUBLISH').options(
    kebabcaseKeys({
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
          'Append the output to the given file. Create it if does not exist.'
      },
      repo: {
        type: 'string',
        description:
          'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
      },
      token: {
        type: 'string',
        description:
          'Personal access token to be used. If not specified, extracted from ENV REPO_TOKEN, GITLAB_TOKEN, GITHUB_TOKEN, or BITBUCKET_TOKEN.'
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab', 'bitbucket'],
        description: 'If not specify it infers it from the ENV.'
      }
    })
  );
