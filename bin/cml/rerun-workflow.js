const kebabcaseKeys = require('kebabcase-keys');

const CML = require('../../src/cml').default;

exports.command = 'rerun-workflow';
exports.description = 'Reruns a workflow given the jobId or workflow Id';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  await cml.pipelineRerun(opts);
};

exports.builder = (yargs) => yargs.env('CML_CI').options(options);

const options = kebabcaseKeys({
  id: {
    type: 'string',
    description: 'Specifies the run Id to be rerun.'
  }
});
