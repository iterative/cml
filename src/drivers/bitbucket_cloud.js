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

    // Make a comment in the commit
    const commit_endpoint = `/repositories/${project_path}/commit/${commit_sha}/comments/`;
    const commit_body = JSON.stringify({ content: { raw: report } });
    const commit_output = await this.request({
      endpoint: commit_endpoint,
      method: 'POST',
      body: commit_body
    });

    // Check for a corresponding PR. If it exists, also put the comment there.
    const get_pr_endpt = `/repositories/${project_path}/commit/${commit_sha}/pullrequests`;
    const pr_out = await this.request({ endpoint: get_pr_endpt });
    if (pr_out.values && pr_out.values.length) {
      // Get PR ID
      const pr_id = pr_out.values[0].id;
      // Append a watermark to the report with a link to the commit
      const commit_link = commit_sha.substr(0, 7);
      const long_report = `${commit_link}   \n${report}`;
      const pr_body = JSON.stringify({ content: { raw: long_report } });

      // Write a comment on the PR
      const pr_endpoint = `/repositories/${project_path}/pullrequests/${pr_id}/comments`;
      await this.request({
        endpoint: pr_endpoint,
        method: 'POST',
        body: pr_body
      });
    }
    return commit_output;
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
    console.log(url);
    if (response.status > 300) throw new Error(response.statusText);

    return await response.json();
  }
}

module.exports = BitBucketCloud;
