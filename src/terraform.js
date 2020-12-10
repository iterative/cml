const fs = require('fs').promises;
const { exec } = require('./utils');

const version = async () => {
  const output = await exec('terraform version -json');
  const { terraform_version } = JSON.parse(output);
  return terraform_version;
};

const load_tfstate = async (path) => {
  const json = await fs.readFile(path, 'utf-8');
  return JSON.parse(json);
};

const save_tfstate = async (opts = {}) => {
  const { path, tfstate } = opts;
  await fs.writeFile(path, JSON.stringify(tfstate, null, '\t'));
};

const fix_tfstate_version = async (opts = {}) => {
  const { path } = opts;
  const ver = await version();
  const tfstate = await load_tfstate(path);
  tfstate.terraform_version = ver;
  await save_tfstate({ path, tfstate });
};

const initapply = async (opts = {}) => {
  const { dir = '' } = opts;
  return await exec(
    `terraform init ${dir} && terraform apply -auto-approve ${dir}`
  );
};

const initdestroy = async (opts = {}) => {
  const { dir = '', target } = opts;
  const targetop = target ? `-target=${target}` : '';
  return await exec(
    `terraform init ${dir} && terraform destroy -auto-approve ${targetop} ${dir}`
  );
};

const iterative_tpl = (opts = {}) => {
  const { cloud, region, name, type, gpu, hdd_size, ssh_public } = opts;

  const tpl = `
terraform {
  required_providers {
    iterative = {
      source = "iterative/iterative"
      version = "0.5.2"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  ${cloud ? `cloud = "${cloud}"` : ''}
  ${region ? `region = "${region}"` : ''}
  ${name ? `instance_name = "${name}"` : ''}
  ${type ? `instance_type = "${type}"` : ''}
  ${gpu ? `instance_gpu = "${gpu}"` : ''}
  ${hdd_size ? `instance_hdd_size = "${hdd_size}"` : ''}
  ${ssh_public ? `key_public = "${ssh_public}"` : ''}
}
`;

  return tpl;
};

exports.version = version;
exports.load_tfstate = load_tfstate;
exports.save_tfstate = save_tfstate;
exports.fix_tfstate_version = fix_tfstate_version;
exports.initapply = initapply;
exports.initdestroy = initdestroy;
exports.iterative_tpl = iterative_tpl;
