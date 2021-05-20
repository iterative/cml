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

    if (repo !== 'cml') {
      const { protocol, host, pathname } = new URL(this.repo);
      this.repo_origin = `${protocol}//${host}`;
      this.api = 'https://api.bitbucket.org/2.0';
      this.projectPath = encodeURIComponent(pathname.substring(1));
    }
  }

  async commentCreate(opts = {}) {
    const { projectPath } = this;
    const { commitSha, report } = opts;

    // Make a comment in the commit
    const commitEndpoint = `/repositories/${projectPath}/commit/${commitSha}/comments/`;
    const commitBody = JSON.stringify({ content: { raw: report } });
    const commitOutput = await this.request({
      endpoint: commitEndpoint,
      method: 'POST',
      body: commitBody
    });

    // Check for a corresponding PR. If it exists, also put the comment there.
    const getPrEndpt = `/repositories/${projectPath}/commit/${commitSha}/pullrequests`;
    const { values: prs } = await this.request({ endpoint: getPrEndpt });

    if (prs && prs.length) {
      for (const pr of prs) {
        try {
          // Append a watermark to the report with a link to the commit
          const commitLink = commitSha.substr(0, 7);
          const longReport = `${commitLink}   \n${report}`;
          const prBody = JSON.stringify({ content: { raw: longReport } });

          // Write a comment on the PR
          const prEndpoint = `/repositories/${projectPath}/pullrequests/${pr.id}/comments`;
          await this.request({
            endpoint: prEndpoint,
            method: 'POST',
            body: prBody
          });
        } catch (err) {
          console.debug(err.message);
        }
      }
    }

    return commitOutput;
  }

  async checkCreate() {
    throw new Error('BitBucket Cloud does not support check!');
  }

  async upload(opts = {}) {
    throw new Error('BitBucket Cloud does not support upload!');
  }

  async runnerToken() {
    throw new Error('BitBucket Cloud does not support runnerToken!');
  }

  async registerRunner(opts = {}) {
    throw new Error('BitBucket Cloud does not support registerRunner!');
  }

  async unregisterRunner(opts = {}) {
    throw new Error('BitBucket Cloud does not support unregisterRunner!');
  }

  async runnerByName(opts = {}) {
    throw new Error('BitBucket Cloud does not support runnerByName!');
  }

  async runnersByLabels(opts = {}) {
    throw new Error('BitBucket Cloud does not support runner_by_labels!');
  }

  async prCreate(opts = {}) {
    const { projectPath } = this;
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
    const endpoint = `/repositories/${projectPath}/pullrequests/`;
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
    const { projectPath } = this;
    const { state = 'OPEN' } = opts;

    const endpoint = `/repositories/${projectPath}/pullrequests?state=${state}`;
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

  get userEmail() {}

  get userName() {}
}

module.exports = BitBucketCloud;
