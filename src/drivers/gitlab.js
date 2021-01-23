const fetch = require('node-fetch');
const FormData = require('form-data');
const { URL, URLSearchParams } = require('url');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const fse = require('fs-extra');
const { resolve } = require('path');

const { fetch_upload_data, download, exec } = require('../utils');

const { IN_DOCKER } = process.env;

class Gitlab {
  constructor(opts = {}) {
    const { repo, token } = opts;

    if (!token) throw new Error('token not found');
    if (!repo) throw new Error('repo not found');

    this.token = token;
    this.repo = repo;

    const { protocol, host, pathname } = new URL(this.repo);
    this.repo_origin = `${protocol}//${host}`;
    this.api_v4 = `${this.repo_origin}/api/v4`;
    this.project_path = encodeURIComponent(pathname.substring(1));
  }

  async comment_create(opts = {}) {
    const { project_path } = this;
    const { commit_sha, report } = opts;

    const endpoint = `/projects/${project_path}/repository/commits/${commit_sha}/comments`;
    const body = new URLSearchParams();
    body.append('note', report);

    const output = await this.request({ endpoint, method: 'POST', body });

    return output;
  }

  async check_create() {
    throw new Error('Gitlab does not support check!');
  }

  async upload(opts = {}) {
    const { project_path, repo } = this;
    const endpoint = `/projects/${project_path}/uploads`;
    const { size, mime, data } = await fetch_upload_data(opts);
    const body = new FormData();
    body.append('file', data);

    const { url } = await this.request({ endpoint, method: 'POST', body });

    return { uri: `${repo}${url}`, mime, size };
  }

  async runner_token() {
    const { project_path } = this;

    const endpoint = `/projects/${project_path}`;

    const { runners_token } = await this.request({ endpoint });

    return runners_token;
  }

  async register_runner(opts = {}) {
    const { tags, name } = opts;

    const token = await this.runner_token();
    const endpoint = `/runners`;
    const body = new URLSearchParams();
    body.append('description', name);
    body.append('tag_list', tags);
    body.append('token', token);
    body.append('locked', 'true');
    body.append('run_untagged', 'true');
    body.append('access_level', 'not_protected');

    return await this.request({ endpoint, method: 'POST', body });
  }

  async unregister_runner(opts = {}) {
    const { name } = opts;

    const { id } = await this.runner_by_name({ name });
    const endpoint = `/runners/${id}`;

    return await this.request({ endpoint, method: 'DELETE', raw: true });
  }

  async start_runner(opts) {
    const { workdir, idle_timeout, labels, name } = opts;

    let gpu = true;
    try {
      await exec('nvidia-smi');
    } catch (err) {
      gpu = false;
    }

    try {
      const bin = resolve(workdir, 'gitlab-runner');
      if (!(await fse.pathExists(bin))) {
        const url =
          'https://gitlab-runner-downloads.s3.amazonaws.com/latest/binaries/gitlab-runner-linux-amd64';
        await download({ url, path: bin });
        await fs.chmod(bin, '777');
      }

      const { protocol, host } = new URL(this.repo);
      const { token } = await this.register_runner({ tags: labels, name });
      const command = `${bin} --log-format="json" run-single \
        --builds-dir "${workdir}" \
        --cache-dir "${workdir}" \
        --url "${protocol}//${host}" \
        --name "${name}" \
        --token "${token}" \
        --wait-timeout ${idle_timeout} \
        --executor "${IN_DOCKER ? 'shell' : 'docker'}" \
        --docker-image "dvcorg/cml:latest" \
        --docker-runtime "${gpu ? 'nvidia' : ''}"`;

      return spawn(command, { shell: true });
    } catch (err) {
      throw new Error(`Failed preparing Gitlab runner: ${err.message}`);
    }
  }

  async runner_by_name(opts = {}) {
    const { name } = opts;

    const endpoint = `/runners?per_page=100`;
    const runners = await this.request({ endpoint, method: 'GET' });
    const runner = runners.filter(
      (runner) => runner.name === name || runner.description === name
    )[0];

    if (runner) return { id: runner.id, name: runner.name };
  }

  async request(opts = {}) {
    const { token, api_v4 } = this;
    const { endpoint, method = 'GET', body, raw } = opts;

    if (!endpoint) throw new Error('Gitlab API endpoint not found');

    const headers = { 'PRIVATE-TOKEN': token, Accept: 'application/json' };
    const url = `${api_v4}${endpoint}`;
    const response = await fetch(url, { method, headers, body });

    if (response.status > 300) throw new Error(response.statusText);
    if (raw) return response;

    return await response.json();
  }
}

module.exports = Gitlab;
