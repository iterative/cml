const fs = require('fs').promises;
const { Buffer } = require('buffer');
const { ltr } = require('semver');
const winston = require('winston');
const { exec } = require('./utils');

const MIN_TF_VER = '0.14.0';

const version = async () => {
  try {
    const output = await exec('terraform version -json');
    const { terraform_version: ver } = JSON.parse(output);
    return ver;
  } catch (err) {
    const output = await exec('terraform version');
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
  return await exec(`terraform -chdir='${dir}' init`);
};

const apply = async (opts = {}) => {
  const { dir = './', json = false } = opts;
  if (json) {
    return new Promise((resolve, reject) => {
      const stderrCollection = [];
      const env = process.env;
      if (env.TF_LOG_PROVIDER === undefined) env.TF_LOG_PROVIDER = 'DEBUG';
      const tfProc = require('child_process').spawn(
        'terraform',
        [`-chdir='${dir}'`, 'apply', '-auto-approve', '-json'],
        {
          cwd: process.cwd(),
          env: env,
          shell: true
        }
      );
      tfProc.stdout.on('data', (buf) => {
        const parse = (line) => {
          if (line === '') return;
          try {
            const log = JSON.parse(line);
            if (log['@level'] === 'error') {
              winston.error(`terraform error: ${log['@message']}`);
            } else {
              winston.info(log['@message']);
            }
          } catch (err) {
            // Failed to parse json from buffer
            winston.info(line);
          }
        };
        buf.toString('utf8').split('\n').forEach(parse);
      });
      tfProc.stderr.on('data', (buf) => {
        stderrCollection.push(buf);
      });
      tfProc.on('close', (code, signal) => {
        if (code !== 0) {
          const stderrOutput = Buffer.concat(stderrCollection).toString('utf8');
          process.stdout.write(stderrOutput);
          reject(new Error('terraform apply error', { code, signal }));
        }
        resolve();
      });
    });
  } else {
    return await exec(`terraform -chdir='${dir}' apply -auto-approve`);
  }
};

const destroy = async (opts = {}) => {
  const { dir = './', target } = opts;
  const targetop = target ? `-target=${target}` : '';
  return await exec(
    `terraform -chdir='${dir}' destroy -auto-approve ${targetop}`
  );
};

const mapCloudMetadata = (metadata) =>
  Object.entries(metadata).map(([key, value]) => `${key} = "${value || ''}"`);

const iterativeProviderTpl = (opts = {}) => {
  const { tpiVersion } = opts;
  return `terraform {
  required_providers {
    iterative = { source = "iterative/iterative"${
      tpiVersion ? `, version = "${tpiVersion}"` : ''
    } }
  }
}
provider "iterative" {}
`;
};

const iterativeCmlRunnerTpl = (opts = {}) => {
  const {
    repo,
    token,
    driver,
    labels,
    cmlVersion,
    idleTimeout,
    cloud,
    region,
    name,
    single,
    type,
    permissionSet,
    metadata,
    gpu,
    hddSize,
    sshPrivate,
    spot,
    spotPrice,
    startupScript,
    awsSecurityGroup,
    awsSubnet,
    dockerVolumes
  } = opts;

  const template = `${iterativeProviderTpl(opts)}
resource "iterative_cml_runner" "runner" {
  ${repo ? `repo = "${repo}"` : ''}
  ${token ? `token = "${token}"` : ''}
  ${driver ? `driver = "${driver}"` : ''}
  ${labels ? `labels = "${labels}"` : ''}
  ${cmlVersion ? `cml_version = "${cmlVersion}"` : ''}
  ${typeof idleTimeout !== 'undefined' ? `idle_timeout = ${idleTimeout}` : ''}
  ${name ? `name = "${name}"` : ''}
  ${single ? `single = "${single}"` : ''}
  ${cloud ? `cloud = "${cloud}"` : ''}
  ${region ? `region = "${region}"` : ''}
  ${type ? `instance_type = "${type}"` : ''}
  ${gpu ? `instance_gpu = "${gpu}"` : ''}
  ${hddSize ? `instance_hdd_size = ${hddSize}` : ''}
  ${permissionSet ? `instance_permission_set = "${permissionSet}"` : ''}
  ${sshPrivate ? `ssh_private = "${sshPrivate}"` : ''}
  ${spot ? `spot = ${spot}` : ''}
  ${spotPrice ? `spot_price = ${spotPrice}` : ''}
  ${startupScript ? `startup_script = "${startupScript}"` : ''}
  ${awsSecurityGroup ? `aws_security_group = "${awsSecurityGroup}"` : ''}
  ${awsSubnet ? `aws_subnet_id = "${awsSubnet}"` : ''}
  ${
    metadata
      ? `metadata = {\n    ${mapCloudMetadata(metadata).join('\n    ')}\n  }`
      : ''
  }
  ${dockerVolumes ? `docker_volumes = ${JSON.stringify(dockerVolumes)}` : ''}
}
`;
  return template;
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
