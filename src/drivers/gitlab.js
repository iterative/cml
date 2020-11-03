const fetch = require('node-fetch');
const FormData = require('form-data');
const { URL, URLSearchParams } = require('url');

const { fetch_upload_data } = require('../utils');

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
    const { tags, runner_token, name } = opts;

    const endpoint = `/runners`;
    const body = new URLSearchParams();
    body.append('description', name);
    body.append('token', runner_token);
    body.append('tag_list', tags);
    body.append('locked', 'true');
    body.append('run_untagged', 'true');
    body.append('access_level', 'not_protected');

    return await this.request({ endpoint, method: 'POST', body });
  }

  async unregister_runner(opts = {}) {
    throw new Error('Gitlab does not support unregister_runner!');
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
    const { endpoint, method = 'GET', body } = opts;

    if (!endpoint) throw new Error('Gitlab API endpoint not found');

    const headers = { 'PRIVATE-TOKEN': token, Accept: 'application/json' };
    const url = `${api_v4}${endpoint}`;
    const response = await fetch(url, { method, headers, body });

    if (response.status > 300) throw new Error(response.statusText);

    return await response.json();
  }
}

module.exports = Gitlab;
