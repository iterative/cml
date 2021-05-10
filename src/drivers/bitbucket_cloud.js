const fetch = require('node-fetch');
const { URL } = require('url');

const { BITBUCKET_COMMIT, BITBUCKET_BRANCH } = process.env;
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
    const { values: prs } = await this.request({ endpoint: get_pr_endpt });

    if (prs && prs.length) {
      for (const pr of prs) {
        try {
          // Append a watermark to the report with a link to the commit
          const commit_link = commit_sha.substr(0, 7);
          const long_report = `${commit_link}   \n${report}`;
          const pr_body = JSON.stringify({ content: { raw: long_report } });

          // Write a comment on the PR
          const pr_endpoint = `/repositories/${project_path}/pullrequests/${pr.id}/comments`;
          await this.request({
            endpoint: pr_endpoint,
            method: 'POST',
            body: pr_body
          });
        } catch (err) {
          console.debug(err.message);
        }
      }
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

  async runners_by_labels(opts = {}) {
    throw new Error('BitBucket Cloud does not support runner_by_labels!');
  }

  async pr_create(opts = {}) {
    const { project_path } = this;
    const { source, target, title, description } = opts;

    const body = JSON.stringify({
      title,
      description,
      source: {
        branch: {
          name: source
        }
      },
      destination: {
        branch: {
          name: target
        }
      }
    });
    const endpoint = `/repositories/${project_path}/pullrequests/`;
    const {
      links: {
        html: { href }
      }
    } = await this.request({
      method: 'POST',
      endpoint,
      body
    });

    return href;
  }

  async prs(opts = {}) {
    const { project_path } = this;
    const { state = 'OPEN' } = opts;

    const endpoint = `/repositories/${project_path}/pullrequests?state=${state}`;
    const { values: prs } = await this.request({ endpoint });

    return prs.map((pr) => {
      const {
        links: {
          html: { href: url }
        },
        source: {
          branch: { name: source }
        },
        destination: {
          branch: { name: target }
        }
      } = pr;
      return {
        url,
        source,
        target
      };
    });
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
    const response = await fetch(url, { method, headers, body });

    if (response.status > 300) {
      const {
        error: { message }
      } = await response.json();
      throw new Error(`${response.statusText} ${message}`);
    }

    return await response.json();
  }

  get sha() {
    return BITBUCKET_COMMIT;
  }

  get branch() {
    return BITBUCKET_BRANCH;
  }

  get user_email() {}

  get user_name() {}
}

module.exports = BitBucketCloud;
