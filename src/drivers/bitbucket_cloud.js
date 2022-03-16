const fetch = require('node-fetch');
const winston = require('winston');
const { URL } = require('url');
const ProxyAgent = require('proxy-agent');

const { BITBUCKET_COMMIT, BITBUCKET_BRANCH, BITBUCKET_PIPELINE_UUID } =
  process.env;
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

    const endpoint = `/repositories/${projectPath}/commit/${commitSha}/pullrequests?state=${state}`;
    const prs = await this.paginatedRequest({ endpoint });
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

  async runnerById(opts = {}) {
    throw new Error('Not yet implemented');
  }

  async prCreate(opts = {}) {
    const { projectPath } = this;
    const { source, target, title, description, autoMerge } = opts;

    if (autoMerge) {
      throw new Error(
        'Auto-merging is unsupported by Bitbucket Cloud. See https://jira.atlassian.com/browse/BCLOUD-14286'
      );
    }

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

  async pipelineRerun(opts = {}) {
    const { projectPath } = this;
    const { id = BITBUCKET_PIPELINE_UUID } = opts;

    const {
      target,
      state: { name: status }
    } = await this.request({
      endpoint: `/repositories/${projectPath}/pipelines/${id}`,
      method: 'GET'
    });

    if (status !== 'COMPLETED') return;

    await this.request({
      endpoint: `/repositories/${projectPath}/pipelines/`,
      method: 'POST',
      body: JSON.stringify({ target })
    });
  }

  async pipelineRestart(opts = {}) {
    throw new Error('BitBucket Cloud does not support workflowRestart!');
  }

  async pipelineJobs(opts = {}) {
    throw new Error('Not implemented');
  }

  async updateGitConfig({ userName, userEmail } = {}) {
    const [user, password] = Buffer.from(this.token, 'base64')
      .toString('utf-8')
      .split(':');
    const repo = new URL(this.repo);
    repo.password = password;
    repo.username = user;

    const command = `
    git config --unset user.name;
    git config --unset user.email;
    git config --unset push.default;
    git config --unset http.http://${this.repo
      .replace('https://', '')
      .replace('.git', '')}.proxy;
    git config user.name "${userName || this.userName}" &&
    git config user.email "${userEmail || this.userEmail}" &&
    git remote set-url origin "${repo.toString()}${
      repo.toString().endsWith('.git') ? '' : '.git'
    }"`;

    return command;
  }

  get sha() {
    return BITBUCKET_COMMIT;
  }

  get branch() {
    return BITBUCKET_BRANCH;
  }

  get userEmail() {}

  get userName() {}

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

    if (!(url || endpoint))
      throw new Error('Bitbucket Cloud API endpoint not found');
    const headers = {
      'Content-Type': 'application/json',
      Authorization: 'Basic ' + `${token}`
    };

    const requestUrl = url || `${api}${endpoint}`;
    winston.debug(`${method} ${requestUrl}`);

    const response = await fetch(requestUrl, {
      method,
      headers,
      body,
      agent: new ProxyAgent()
    });

    if (response.status > 300) {
      try {
        const json = await response.json();
        winston.debug(json);
        // Attempt to get additional context. We have observed two different error schemas
        // from BitBucket API responses: `{"error": {"message": "Error message"}}` and
        // `{"error": "Error message"}`.
        throw new Error(json.error.message || json.error);
      } catch (err) {
        throw new Error(`${response.statusText} ${err.message}`);
      }
    }

    return await response.json();
  }
}

module.exports = BitbucketCloud;
