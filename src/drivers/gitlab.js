const fetch = require('node-fetch');
const FormData = require('form-data');
const { URL, URLSearchParams } = require('url');

const { fetch_upload_data, strip_last_chars } = require('../utils');

class Gitlab {
  constructor(opts = {}) {
    const { repo = this.env_repo(), token = this.env_token() } = opts;

    if (!repo) throw new Error('repo not found');
    if (!token) throw new Error('token not found');

    this.repo = repo.endsWith('/')
      ? strip_last_chars({ str: repo, size: 1 })
      : repo;
    this.token = token;

    const { protocol, host, pathname } = new URL(this.repo);
    this.repo_origin = `${protocol}//${host}`;
    this.api_v4 = `${this.repo_origin}/api/v4`;
    this.project_path = encodeURIComponent(pathname.substring(1));
  }

  env_repo() {
    const { CI_PROJECT_URL } = process.env;
    return CI_PROJECT_URL;
  }

  env_token() {
    const { repo_token, GITLAB_TOKEN } = process.env;
    return repo_token || GITLAB_TOKEN;
  }

  env_is_pr() {
    const { CI_MERGE_REQUEST_ID } = process.env;
    return typeof CI_MERGE_REQUEST_ID !== 'undefined';
  }

  env_head_sha() {
    const { CI_COMMIT_SHA } = process.env;
    return CI_COMMIT_SHA;
  }

  async comment_create(opts = {}) {
    const { project_path } = this;
    const { commit_sha = this.env_head_sha(), report } = opts;

    const endpoint = `/projects/${project_path}/repository/commits/${commit_sha}/comments`;
    const body = new URLSearchParams();
    body.append('note', report);

    const output = await this.request({ endpoint, method: 'POST', body });

    return output;
  }

  async check_create() {
    throw new Error('Gitlab does not support check!');
  }

  async publish(opts = {}) {
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
    const { tags, runner_token } = opts;

    const endpoint = `/runners`;
    const body = new URLSearchParams();
    body.append('token', runner_token);
    body.append('tag_list', tags);
    body.append('locked', 'true');
    body.append('run_untagged', 'true');
    body.append('access_level', 'not_protected');

    return await this.request({ endpoint, method: 'POST', body });
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
