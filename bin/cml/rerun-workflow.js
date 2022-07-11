const kebabcaseKeys = require('kebabcase-keys');

const CML = require('../../src/cml').default;
const analytics = require('../../src/analytics');

exports.command = 'rerun-workflow';
exports.description = 'Reruns a workflow given the jobId or workflow Id';

exports.handler = async (opts) => {
  const cml = new CML(opts);
  const event = await analytics.jitsuEventPayload({
    action: 'rerun-workflow',
    cml
  });

  try {
    await cml.pipelineRerun(opts);
    analytics.send({ event });
  } catch (err) {
    analytics.send({ ...event, error: err.message });
    throw err;
  }
};

exports.builder = (yargs) =>
  yargs.env('CML_CI').options(
    kebabcaseKeys({
      id: {
        type: 'string',
        description: 'Specifies the run Id to be rerun.'
      },
      repo: {
        type: 'string',
        description:
          'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
      },
      token: {
        type: 'string',
        description:
          'Personal access token to be used. If not specified in extracted from ENV REPO_TOKEN.'
      },
      driver: {
        type: 'string',
        choices: ['github', 'gitlab', 'bitbucket'],
        description: 'If not specify it infers it from the ENV.'
      }
    })
  );
