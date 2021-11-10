const fetch = require('node-fetch');
const { URL } = require('url');
const ProxyAgent = require('proxy-agent');

const { BITBUCKET_COMMIT, BITBUCKET_BRANCH } = process.env;
class BitbucketCloud {
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

    const endpoint = `/repositories/${projectPath}/commit/${commitSha}/comments/`;
    return (
      await this.request({
        endpoint,
        method: 'POST',
        body: JSON.stringify({ content: { raw: report } })
      })
    ).links.html.href;
  }

  async commentUpdate(opts = {}) {
    const { projectPath } = this;
    const { commitSha, report, id } = opts;

    const endpoint = `/repositories/${projectPath}/commit/${commitSha}/comments/${id}`;
    return (
      await this.request({
        endpoint,
        method: 'PUT',
        body: JSON.stringify({ content: { raw: report } })
      })
    ).links.html.href;
  }

  async commitComments(opts = {}) {
    const { projectPath } = this;
    const { commitSha } = opts;

    const endpoint = `/repositories/${projectPath}/commit/${commitSha}/comments/`;

    return (await this.paginatedRequest({ endpoint, method: 'GET' })).map(
      ({ id, content: { raw: body = '' } = {} }) => {
        return { id, body };
      }
    );
  }

  async commitPrs(opts = {}) {
    const { projectPath } = this;
    const { commitSha, state = 'OPEN' } = opts;

    console.log('here');
    try {
      const endpoint = `/repositories/${projectPath}/commit/${commitSha}/pullrequests?state=${state}`;
      console.log(endpoint);
      const prs = await this.paginatedRequest({ endpoint });
      console.log('here');
      return prs.map((pr) => {
        const {
          links: {
            html: { href: url }
          }
        } = pr;
        return {
          url
        };
      });
    } catch (err) {
      return [];
    }
  }

  async checkCreate() {
    throw new Error('Bitbucket Cloud does not support check!');
  }

  async upload(opts = {}) {
    throw new Error('Bitbucket Cloud does not support upload!');
  }

  async runnerToken() {
    throw new Error('Bitbucket Cloud does not support runnerToken!');
  }

  async registerRunner(opts = {}) {
    throw new Error('Bitbucket Cloud does not support registerRunner!');
  }

  async unregisterRunner(opts = {}) {
    throw new Error('Bitbucket Cloud does not support unregisterRunner!');
  }

  async runners(opts = {}) {
    throw new Error('Bitbucket Cloud does not support runners!');
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

  async prCommentCreate(opts = {}) {
    const { projectPath } = this;
    const { report, prNumber } = opts;

    const endpoint = `/repositories/${projectPath}/pullrequests/${prNumber}/comments/`;
    const output = await this.request({
      endpoint,
      method: 'POST',
      body: JSON.stringify({ content: { raw: report } })
    });

    return output.links.self.href;
  }

  async prCommentUpdate(opts = {}) {
    const { projectPath } = this;
    const { report, prNumber, id } = opts;

    const endpoint = `/repositories/${projectPath}/pullrequests/${prNumber}/comments/${id}`;
    const output = await this.request({
      endpoint,
      method: 'PUT',
      body: JSON.stringify({ content: { raw: report } })
    });

    return output.links.self.href;
  }

  async prComments(opts = {}) {
    const { projectPath } = this;
    const { prNumber } = opts;

    const endpoint = `/repositories/${projectPath}/pullrequests/${prNumber}/comments/`;
    return (await this.paginatedRequest({ endpoint, method: 'GET' })).map(
      ({ id, content: { raw: body = '' } = {} }) => {
        return { id, body };
      }
    );
  }

  async prs(opts = {}) {
    const { projectPath } = this;
    const { state = 'OPEN' } = opts;

    try {
      const endpoint = `/repositories/${projectPath}/pullrequests?state=${state}`;
      const prs = await this.paginatedRequest({ endpoint });

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
    } catch (err) {
      if (err.message === 'Not Found Resource not found')
        err.message =
          "Click 'Go to pull request' on any commit details page to enable this API";
      throw err;
    }
  }

  async pipelineRestart(opts = {}) {
    throw new Error('BitBucket Cloud does not support workflowRestart!');
  }

  async pipelineJobs(opts = {}) {
    throw new Error('Not implemented');
  }

  async paginatedRequest(opts = {}) {
    const { method = 'GET', body } = opts;
    const { next, values } = await this.request(opts);

    if (next) {
      const nextValues = await this.paginatedRequest({
        url: next,
        method,
        body
      });
      values.push(...nextValues);
    }

    return values;
  }

  async request(opts = {}) {
    const { token, api } = this;
    const { url, endpoint, method = 'GET', body } = opts;
    console.log({ url, endpoint, method, body });
    if (!(url || endpoint))
      throw new Error('Bitbucket Cloud API endpoint not found');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + `${token}`
    };

    const response = await fetch(url || `${api}${endpoint}`, {
      method,
      headers,
      body,
      agent: new ProxyAgent()
    });

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

module.exports = BitbucketCloud;
