const fetch = require('node-fetch');
const { URL } = require('url');
const { spawn } = require('child_process');
const ProxyAgent = require('proxy-agent');

const winston = require('winston');

const { exec } = require('../utils');

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

    try {
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
    } catch (err) {
      if (err.message === 'Not Found Resource not found')
        err.message =
          "Click 'Go to pull request' on any commit details page to enable this API";
      throw err;
    }
  }

  async checkCreate() {
    throw new Error('Bitbucket Cloud does not support check!');
  }

  async upload(opts = {}) {
    throw new Error('Bitbucket Cloud does not support upload!');
  }

  async runnerToken() {
    return '';
  }

  async startRunner(opts) {
    const { projectPath } = this;
    const { name, labels } = opts;

    try {
      const { uuid: accountId } = await this.request({ endpoint: `/user` });
      const { uuid: repoId } = await this.request({
        endpoint: `/repositories/${projectPath}`
      });
      const {
        uuid,
        oauth_client: { id, secret }
      } = await this.registerRunner({ name, labels });
      const command = `docker container run -t -a stderr -a stdout --rm \
      -v /tmp:/tmp \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
      -e ACCOUNT_UUID=${accountId} \
      -e REPOSITORY_UUID=${repoId} \
      -e RUNNER_UUID=${uuid} \
      -e OAUTH_CLIENT_ID=${id} \
      -e OAUTH_CLIENT_SECRET=${secret} \
      -e WORKING_DIRECTORY=/tmp \
      --name ${name} \
      docker-public.packages.atlassian.com/sox/atlassian/bitbucket-pipelines-runner:1`;

      return spawn(command, { shell: true });
    } catch (err) {
      throw new Error(`Failed preparing runner: ${err.message}`);
    }
  }

  async registerRunner(opts = {}) {
    const { projectPath } = this;
    const { name, labels } = opts;

    const endpoint = `/repositories/${projectPath}/pipelines-config/runners`;

    return await this.request({
      api: 'https://api.bitbucket.org/internal',
      endpoint,
      method: 'POST',
      body: JSON.stringify({ labels: ['self.hosted'].concat(labels), name })
    });
  }

  async unregisterRunner(opts = {}) {
    const { projectPath } = this;
    const { runnerId, name } = opts;
    const endpoint = `/repositories/${projectPath}/pipelines-config/runners/${runnerId}`;

    try {
      await this.request({
        api: 'https://api.bitbucket.org/internal',
        endpoint,
        method: 'DELETE'
      });
    } catch (err) {
      if (!err.message.includes('invalid json response body')) {
        await exec(`docker stop ${name}`);
        throw err;
      }
      winston.warn(`Deleting: ${err.message}`);
    }

    await exec(`docker stop ${name}`);
  }

  async runners(opts = {}) {
    const { projectPath } = this;

    const endpoint = `/repositories/${projectPath}/pipelines-config/runners`;
    const runners = await this.paginatedRequest({
      api: 'https://api.bitbucket.org/internal',
      endpoint
    });

    return runners.map(({ uuid: id, name, labels, state: { status } }) => ({
      id,
      name,
      labels,
      online: status === 'ONLINE',
      busy: status === 'ONLINE'
    }));
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
    winston.warn('BitBucket Cloud does not support workflowRestart yet!');
  }

  async pipelineJobs(opts = {}) {
    winston.warn('BitBucket Cloud does not support pipelineJobs yet!');

    return [];
  }

  async request(opts = {}) {
    const { token, api: bbApi } = this;
    const { url, endpoint, body, method = 'GET', api = bbApi } = opts;
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
