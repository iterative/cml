const kebabcaseKeys = require('kebabcase-keys');

const DESCRIPTION = 'Rerun a workflow given the jobId or workflowId';
const DOCSURL = 'https://cml.dev/doc/ref/workflow';

exports.command = 'rerun';
exports.description = `${DESCRIPTION}\n${DOCSURL}`;

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.pipelineRerun(opts);
};

exports.builder = (yargs) =>
  yargs
    .env('CML_WORKFLOW')
    .option('options', { default: exports.options, hidden: true })
    .options(exports.options);

exports.options = kebabcaseKeys({
  id: {
    type: 'string',
    description: 'Run identifier to be rerun'
  }
});

exports.DOCSURL = DOCSURL;
