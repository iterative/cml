const core = require('@actions/core');
const { exec } = require('./utils');

const setup_cml = async () => {
  const version = core.getInput('version');
  core.info(`Intalling CML version ${version}`);
  await exec(
    `npm i -g @dvcorg/cml${version !== 'latest' ? `@${version}` : ''}`
  );
};

const setup_dvc = async () => {
  const install = core.getInput('dvc_install');
  const version = core.getInput('dvc_version');

  if (install === 'true') {
    core.info(`Intalling DVC version ${version}`);
    await exec(
      `pip install dvc[all]${version !== 'latest' ? `==${version}` : ''}`
    );
  }
};

(async () => {
  try {
    await setup_cml();
    await setup_dvc();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
