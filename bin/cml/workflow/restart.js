const kebabcaseKeys = require('kebabcase-keys');

exports.command = 'restart';
exports.description = 'Restart a workflow given the jobId or workflowId';

exports.handler = async (opts) => {
  const { cml } = opts;
  await cml.pipelineRerun(opts);
};

exports.builder = (yargs) => yargs.env('CML_WORKFLOW').options(exports.options);

exports.options = kebabcaseKeys({
  id: {
    type: 'string',
    description: 'Run identifier to be rerun'
  }
});
