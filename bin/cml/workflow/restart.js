const kebabcaseKeys = require('kebabcase-keys');

const CML = require('../../../src/cml').default;

exports.command = 'restart';
exports.description = 'Restarts a workflow given the jobId or workflowId';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  await cml.pipelineRerun(opts);
};

exports.builder = (yargs) => yargs.env('CML_CI').options(exports.options);

exports.options = kebabcaseKeys({
  id: {
    type: 'string',
    description: 'Specifies the run Id to be rerun.'
  }
});
