const fs = require('fs').promises;
const { ltr } = require('semver');
const { logger } = require('./logger');
const { exec, tfCapture } = require('./utils');

const MIN_TF_VER = '0.14.0';

const version = async () => {
  try {
    const output = await exec('terraform', 'version', '-json');
    const { terraform_version: ver } = JSON.parse(output);
    return ver;
  } catch (err) {
    const output = await exec('terraform', 'version');
    const matches = output.match(/Terraform v(\d{1,2}\.\d{1,2}\.\d{1,2})/);

    if (matches.length < 2) throw new Error('Unable to get TF version');

    return matches[1];
  }
};

const loadTfState = async (opts = {}) => {
  const { path } = opts;
  const json = await fs.readFile(path, 'utf-8');
  return JSON.parse(json);
};

const saveTfState = async (opts = {}) => {
  const { path, tfstate } = opts;
  await fs.writeFile(path, JSON.stringify(tfstate, null, '\t'));
};

const init = async (opts = {}) => {
  const { dir = './' } = opts;
  return await exec('terraform', `-chdir=${dir}`, 'init');
};

const apply = async (opts = {}) => {
  const { dir = './' } = opts;
  const { env } = process;
  if (env.TF_LOG_PROVIDER === undefined) env.TF_LOG_PROVIDER = 'DEBUG';
  try {
    await tfCapture(
      'terraform',
      [`-chdir=${dir}`, 'apply', '-auto-approve', '-json'],
      {
        cwd: process.cwd(),
        env,
        shell: true
      }
    );
  } catch (rejectionLogs) {
    process.stdout.write(rejectionLogs);
    throw new Error('terraform apply error');
  }
};

const destroy = async (opts = {}) => {
  const { dir = './', target } = opts;
  return await exec(
    'terraform',
    `-chdir=${dir}`,
    'destroy',
    '-auto-approve',
    ...(target ? ['-target', target] : [])
  );
};

const iterativeProviderTpl = ({ tpiVersion }) => ({
  terraform: {
    required_providers: {
      iterative: {
        source: 'iterative/iterative',
        ...(tpiVersion && { version: tpiVersion })
      }
    }
  },
  provider: {
    iterative: {}
  }
});

const iterativeCmlRunnerTpl = (opts = {}) => {
  const tfObj = {
    ...iterativeProviderTpl(opts),
    resource: {
      iterative_cml_runner: {
        runner: {
          ...(opts.image && { image: opts.image }),
          ...(opts.awsSecurityGroup && {
            aws_security_group: opts.awsSecurityGroup
          }),
          ...(opts.awsSubnet && { aws_subnet_id: opts.awsSubnet }),
          ...(opts.cloud && { cloud: opts.cloud }),
          ...(opts.cmlVersion && { cml_version: opts.cmlVersion }),
          ...(opts.dockerVolumes && { docker_volumes: opts.dockerVolumes }),
          ...(opts.driver && { driver: opts.driver }),
          ...(opts.gpu && { instance_gpu: opts.gpu }),
          ...(opts.hddSize && { instance_hdd_size: opts.hddSize }),
          ...(typeof opts.idleTimeout !== 'undefined' && {
            idle_timeout: opts.idleTimeout
          }),
          ...(opts.labels && { labels: opts.labels }),
          ...(opts.metadata && { metadata: opts.metadata }),
          ...(opts.name && { name: opts.name }),
          ...(opts.permissionSet && {
            instance_permission_set: opts.permissionSet
          }),
          ...(opts.region && { region: opts.region }),
          ...(opts.repo && { repo: opts.repo }),
          ...(opts.single && { single: opts.single }),
          ...(opts.spot && { spot: opts.spot }),
          ...(opts.spotPrice && { spot_price: opts.spotPrice }),
          ...(opts.sshPrivate && { ssh_private: opts.sshPrivate }),
          ...(opts.startupScript && { startup_script: opts.startupScript }),
          ...(opts.token && { token: opts.token }),
          ...(opts.type && { instance_type: opts.type }),
          ...(opts.kubernetesNodeSelector && {
            kubernetes_node_selector: opts.kubernetesNodeSelector
          })
        }
      }
    }
  };
  logger.debug(`terraform data: ${JSON.stringify(tfObj)}`);
  return tfObj;
};

const checkMinVersion = async () => {
  const ver = await version();
  if (ltr(ver, MIN_TF_VER))
    throw new Error(
      `Terraform version must be greater that 14: current ${ver}`
    );
};

exports.version = version;
exports.loadTfState = loadTfState;
exports.saveTfState = saveTfState;
exports.init = init;
exports.apply = apply;
exports.destroy = destroy;
exports.iterativeProviderTpl = iterativeProviderTpl;
exports.iterativeCmlRunnerTpl = iterativeCmlRunnerTpl;
exports.checkMinVersion = checkMinVersion;
