const fs = require('fs').promises;
const { ltr } = require('semver');
const { exec } = require('./utils');

const MIN_TF_VER = '0.14.0';

const version = async () => {
  try {
    const output = await exec('terraform version -json');
    const { terraform_version } = JSON.parse(output);
    return terraform_version;
  } catch (err) {
    const output = await exec('terraform version');
    const matches = output.match(/Terraform v(\d{1,2}\.\d{1,2}\.\d{1,2})/);

    if (matches.length < 2) throw new Error('Unable to get TF version');

    return matches[1];
  }
};

const load_tfstate = async (opts = {}) => {
  const { path } = opts;
  const json = await fs.readFile(path, 'utf-8');
  return JSON.parse(json);
};

const save_tfstate = async (opts = {}) => {
  const { path, tfstate } = opts;
  await fs.writeFile(path, JSON.stringify(tfstate, null, '\t'));
};

const init = async (opts = {}) => {
  const { dir = './' } = opts;
  return await exec(`terraform -chdir='${dir}' init`);
};

const apply = async (opts = {}) => {
  const { dir = './' } = opts;
  return await exec(`terraform -chdir='${dir}' apply -auto-approve`);
};

const destroy = async (opts = {}) => {
  const { dir = './', target } = opts;
  const targetop = target ? `-target=${target}` : '';
  return await exec(
    `terraform -chdir='${dir}' destroy -auto-approve ${targetop}`
  );
};

const iterative_provider_tpl = () => {
  return `
terraform {
  required_providers {
    iterative = {
      source = "iterative/iterative"
    }
  }
}

provider "iterative" {}
`;
};

const iterative_machine_tpl = (opts = {}) => {
  const {
    repo,
    token,
    driver,
    labels,
    idle_timeout,
    cloud,
    region,
    name,
    type,
    gpu,
    hdd_size,
    ssh_private
  } = opts;

  return `
${iterative_provider_tpl()}

resource "iterative_cml_runner" "runner" {
  ${repo ? `repo = "${repo}"` : ''}
  ${token ? `token = "${token}"` : ''}
  ${driver ? `driver = "${driver}"` : ''}
  ${labels ? `labels = "${labels}"` : ''}
  ${
    typeof idle_timeout !== 'undefined'
      ? `idle_timeout = "${idle_timeout}"`
      : ''
  }
  ${name ? `name = "${name}"` : ''}
  ${cloud ? `cloud = "${cloud}"` : ''}
  ${region ? `region = "${region}"` : ''}
  ${type ? `instance_type = "${type}"` : ''}
  ${gpu ? `instance_gpu = "${gpu}"` : ''}
  ${hdd_size ? `instance_hdd_size = "${hdd_size}"` : ''}
  ${ssh_private ? `ssh_private = "${ssh_private}"` : ''}
}
`;
};

const check_min_version = async () => {
  const ver = await version();
  if (ltr(ver, MIN_TF_VER))
    throw new Error(
      `Terraform version must be greater that 14: current ${ver}`
    );
};

exports.version = version;
exports.load_tfstate = load_tfstate;
exports.save_tfstate = save_tfstate;
exports.init = init;
exports.apply = apply;
exports.destroy = destroy;
exports.iterative_provider_tpl = iterative_provider_tpl;
exports.iterative_machine_tpl = iterative_machine_tpl;
exports.check_min_version = check_min_version;
