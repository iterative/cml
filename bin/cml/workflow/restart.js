const kebabcaseKeys = require('kebabcase-keys');

exports.command = 'restart';
exports.description = 'Restart a workflow given the jobId or workflowId';

const { repoOptions } = require('../../../src/cml');

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.pipelineRerun(opts);
};

exports.builder = (yargs) => yargs.env('CML_WORKFLOW').options(exports.options);

exports.options = kebabcaseKeys({
  ...repoOptions,
  id: {
    type: 'string',
    description: 'Specifies the run Id to be rerun.'
  }
});
