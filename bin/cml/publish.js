const fs = require('fs').promises;
const pipeArgs = require('../../src/pipe-args');

const CML = require('../../src/cml').default;

pipeArgs.load('binary');
const data = pipeArgs.pipedArg(); // HACK: see yargs/yargs#1312

exports.command = data ? 'publish' : 'publish <asset>';
exports.desc = 'Upload an image to build a report';

exports.handler = async (opts) => {
  const { file, repo, native } = opts;

  const path = opts.asset;
  const buffer = data ? Buffer.from(data, 'binary') : null;
  const cml = new CML({ ...opts, repo: native ? repo : 'cml' });

  const output = await cml.publish({
    ...opts,
    buffer,
    path
  });

  if (!file) console.log(output);
  else await fs.writeFile(file, output);
};

exports.builder = (yargs) =>
  yargs
    .describe('md', 'Output in markdown format [title || name](url).')
    .boolean('md')
    .describe('md', 'Output in markdown format [title || name](url).')
    .default('title')
    .describe('title', 'Markdown title [title](url) or ![](url title).')
    .alias('title', 't')
    .boolean('native')
    .describe(
      'native',
      "Uses driver's native capabilities to upload assets instead of CML's storage. Currently only available for GitLab CI."
    )
    .alias('native', 'gitlab-uploads')
    .boolean('rm-watermark')
    .describe('rm-watermark', 'Avoid CML watermark.')
    .default('mime-type')
    .describe(
      'mime-type',
      'Specifies the mime-type. If not set guess it from the content.'
    )
    .default('file')
    .describe(
      'file',
      'Append the output to the given file. Create it if does not exist.'
    )
    .alias('file', 'f')
    .default('repo')
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token')
    .describe(
      'token',
      'Personal access token to be used. If not specified, extracted from ENV REPO_TOKEN, GITLAB_TOKEN, GITHUB_TOKEN, or BITBUCKET_TOKEN.'
    )
    .default('driver')
    .choices('driver', ['github', 'gitlab'])
    .describe('driver', 'If not specify it infers it from the ENV.');
