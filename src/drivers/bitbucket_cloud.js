const fetch = require('node-fetch');
const { URL } = require('url');

class BitBucketCloud {
  constructor(opts = {}) {
    const { repo, token } = opts;

    if (!token) throw new Error('token not found');
    if (!repo) throw new Error('repo not found');

    this.token = token;
    this.repo = repo;

    const { protocol, host, pathname } = new URL(this.repo);
    this.repo_origin = `${protocol}//${host}`;
    this.api = 'https://api.bitbucket.org/2.0';
    this.project_path = encodeURIComponent(pathname.substring(1));
  }

  async comment_create(opts = {}) {
    const { project_path } = this;
    const { commit_sha, report } = opts;

    // Get the PR ID #
    const pr_endpt = `/repositories/${project_path}/commit/${commit_sha}/pullrequests`;
    const pr_out = await this.request({ endpoint: pr_endpt });
    const pr_id = pr_out.values[0].id;

    // Append a watermark to the report with a link to the commit
    const commit_url = `https://bitbucket.org/${project_path}/commits/${commit_sha}`;
    const commit_link = `[Go to commit.](${commit_url})`;
    const long_report = report.concat(commit_link);

    // Write a comment on the PR
    const endpoint = `/repositories/${project_path}/pullrequests/${pr_id}/comments`;
    const body = JSON.stringify({ content: { raw: long_report } });

    const output = await this.request({ endpoint, method: 'POST', body });

    return output;
  }

  async check_create() {
    throw new Error('BitBucket Cloud does not support check!');
  }

  async upload(opts = {}) {
    throw new Error('BitBucket Cloud does not support upload!');
  }

  async runner_token() {
    throw new Error('BitBucket Cloud does not support runner_token!');
  }

  async register_runner(opts = {}) {
    throw new Error('BitBucket Cloud does not support register_runner!');
  }

  async unregister_runner(opts = {}) {
    throw new Error('BitBucket Cloud does not support unregister_runner!');
  }

  async runner_by_name(opts = {}) {
    throw new Error('BitBucket Cloud does not support runner_by_name!');
  }

  async request(opts = {}) {
    const { token, api } = this;
    const { endpoint, method = 'GET', body } = opts;

    if (!endpoint) throw new Error('BitBucket Cloud API endpoint not found');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + `${token}`
    };
    const url = `${api}${endpoint}`;
    console.log(url);
    const response = await fetch(url, { method, headers, body });

    if (response.status > 300) throw new Error(response.statusText);

    return await response.json();
  }
}

module.exports = BitBucketCloud;
