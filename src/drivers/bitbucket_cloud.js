const crypto = require('crypto');
const fetch = require('node-fetch');
const { URL } = require('url');
const { spawn } = require('child_process');
const FormData = require('form-data');
const { ProxyAgent } = require('proxy-agent');
const { logger } = require('../logger');

const { fetchUploadData, exec, gpuPresent, sleep } = require('../utils');

const {
  BITBUCKET_COMMIT,
  BITBUCKET_BRANCH,
  BITBUCKET_PIPELINE_UUID,
  BITBUCKET_BUILD_NUMBER
} = process.env;

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

  async issueCommentUpsert(opts = {}) {
    const { projectPath } = this;
    const { issueId, report, id } = opts;

    const endpoint =
      `/repositories/${projectPath}/issues/${issueId}/` +
      `comments/${id ? id + '/' : ''}`;
    return (
      await this.request({
        endpoint,
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify({ content: { raw: report } })
      })
    ).links.html.href;
  }

  async issueCommentCreate(opts = {}) {
    const { id, ...rest } = opts;
    return this.issueCommentUpsert(rest);
  }

  async issueCommentUpdate(opts = {}) {
    if (!opts.id) throw new Error('Id is missing updating comment');
    return this.issueCommentUpsert(opts);
  }

  async issueComments(opts = {}) {
    const { projectPath } = this;
    const { issueId } = opts;

    const endpoint = `/repositories/${projectPath}/issues/${issueId}/comments/`;
    return (await this.paginatedRequest({ endpoint, method: 'GET' })).map(
      ({ id, content: { raw: body = '' } = {} }) => {
        return { id, body };
      }
    );
  }

  async commitCommentCreate(opts = {}) {
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

  async commitCommentUpdate(opts = {}) {
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
    const { projectPath } = this;
    const { size, mime, data } = await fetchUploadData(opts);

    const chunks = [];
    for await (const chunk of data) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const filename = `cml-${crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex')}`;
    const body = new FormData();
    body.append('files', buffer, { filename });

    const endpoint = `/repositories/${projectPath}/downloads`;
    await this.request({ endpoint, method: 'POST', body });
    return {
      uri: `https://bitbucket.org/${decodeURIComponent(
        projectPath
      )}/downloads/${filename}`,
      mime,
      size
    };
  }

  async runnerToken() {
    return 'DUMMY';
  }

  async startRunner(opts) {
    const { projectPath } = this;
    const { workdir, name, labels, env } = opts;

    logger.warn(
      `Bitbucket runner is working under /tmp folder and not under ${workdir} as expected`
    );

    try {
      const { uuid: accountId } = await this.request({ endpoint: `/user` });
      const { uuid: repoId } = await this.request({
        endpoint: `/repositories/${projectPath}`
      });
      const {
        uuid,
        oauth_client: { id, secret }
      } = await this.registerRunner({ name, labels });

      const gpu = await gpuPresent();
      const command = `docker container run -t -a stderr -a stdout --rm \
      -v /var/run/docker.sock:/var/run/docker.sock \
      -v /var/lib/docker/containers:/var/lib/docker/containers:ro \
      -v /tmp:/tmp \
      -e ACCOUNT_UUID=${accountId} \
      -e REPOSITORY_UUID=${repoId} \
      -e RUNNER_UUID=${uuid} \
      -e OAUTH_CLIENT_ID=${id} \
      -e OAUTH_CLIENT_SECRET=${secret} \
      -e WORKING_DIRECTORY=/tmp \
      --name ${name} \
      ${gpu ? '--runtime=nvidia -e NVIDIA_VISIBLE_DEVICES=all' : ''} \
      docker-public.packages.atlassian.com/sox/atlassian/bitbucket-pipelines-runner:1`;

      return spawn(command, { shell: true, env });
    } catch (err) {
      throw new Error(`Failed preparing runner: ${err.message}`);
    }
  }

  async registerRunner(opts = {}) {
    const { projectPath } = this;
    const { name, labels } = opts;

    const endpoint = `/repositories/${projectPath}/pipelines-config/runners`;

    const request = await this.request({
      api: 'https://api.bitbucket.org/internal',
      endpoint,
      method: 'POST',
      body: JSON.stringify({
        labels: ['self.hosted'].concat(labels.split(',')),
        name
      })
    });

    let registered = false;
    while (!registered) {
      await sleep(1);
      const runner = (await this.runners()).find(
        (runner) => runner.name === name
      );
      if (runner) registered = true;
    }

    return request;
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
        throw err;
      }
    } finally {
      await exec('docker', 'stop', name);
    }
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

  async runnerById(opts = {}) {
    throw new Error('Not yet implemented');
  }

  async prCreate(opts = {}) {
    const { projectPath } = this;
    const { source, target, title, description, autoMerge } = opts;

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
      id,
      links: {
        html: { href }
      }
    } = await this.request({
      method: 'POST',
      endpoint,
      body
    });

    if (autoMerge)
      await this.prAutoMerge({ pullRequestId: id, mergeMode: autoMerge });
    return href;
  }

  runnerLogPatterns() {
    return {
      ready: /Updating runner status to "ONLINE"/,
      job_started: /Getting step StepId/,
      job_ended: /Completing step with result/,
      job_ended_succeded: /Completing step with result Result{status=PASSED/,
      pipeline: /pipelineUuid=({.+}), /,
      job: /stepUuid=({.+})}/
    };
  }

  async prAutoMerge({ pullRequestId, mergeMode, mergeMessage }) {
    logger.warn(
      'Auto-merge is unsupported by Bitbucket Cloud; see https://jira.atlassian.com/browse/BCLOUD-14286. Trying to merge immediately...'
    );
    const { projectPath } = this;
    const endpoint = `/repositories/${projectPath}/pullrequests/${pullRequestId}/merge`;
    const mergeModes = {
      merge: 'merge_commit',
      rebase: 'fast_forward',
      squash: 'squash'
    };
    const body = JSON.stringify({
      merge_strategy: mergeModes[mergeMode],
      close_source_branch: true,
      message: mergeMessage
    });
    await this.request({
      method: 'POST',
      endpoint,
      body
    });
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

  async pipelineRerun({ id = BITBUCKET_PIPELINE_UUID, jobId } = {}) {
    const { projectPath } = this;

    if (!id && jobId)
      logger.warn('BitBucket Cloud does not support pipelineRerun by jobId!');

    const { target } = await this.request({
      endpoint: `/repositories/${projectPath}/pipelines/${id}`,
      method: 'GET'
    });

    await this.request({
      endpoint: `/repositories/${projectPath}/pipelines/`,
      method: 'POST',
      body: JSON.stringify({ target })
    });
  }

  async pipelineJobs(opts = {}) {
    logger.warn('BitBucket Cloud does not support pipelineJobs yet!');

    return [];
  }

  async updateGitConfig({ userName, userEmail, remote } = {}) {
    const [user, password] = Buffer.from(this.token, 'base64')
      .toString('utf-8')
      .split(':');

    const repo = new URL(this.repo);
    repo.password = password;
    repo.username = user;
    repo.protocol = 'https';
    repo.pathname = repo.pathname.replace('.git', '');

    const commands = [
      ['git', 'config', '--unset', 'user.name'],
      ['git', 'config', '--unset', 'user.email'],
      ['git', 'config', '--unset', 'push.default'],
      [
        'git',
        'config',
        '--unset',
        `http.http://${repo.host}${repo.pathname}.proxy`
      ],
      ['git', 'config', 'user.name', userName || this.userName],
      ['git', 'config', 'user.email', userEmail || this.userEmail],
      ['git', 'remote', 'set-url', remote, repo.toString()]
    ];

    return commands;
  }

  get workflowId() {
    return BITBUCKET_PIPELINE_UUID;
  }

  get runId() {
    return BITBUCKET_BUILD_NUMBER;
  }

  get sha() {
    return BITBUCKET_COMMIT;
  }

  /**
   * Returns the PR number if we're in a PR-related action event.
   */
  get pr() {
    if ('BITBUCKET_PR_ID' in process.env) {
      return process.env.BITBUCKET_PR_ID;
    }
    return null;
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
    const { token } = this;
    const { url, endpoint, method = 'GET', body, api = this.api } = opts;

    if (!(url || endpoint))
      throw new Error('Bitbucket Cloud API endpoint not found');

    const headers = { Authorization: `Basic ${token}` };
    if (!body || body.constructor !== FormData)
      headers['Content-Type'] = 'application/json';

    const requestUrl = url || `${api}${endpoint}`;
    logger.debug(
      `Bitbucket API request, method: ${method}, url: "${requestUrl}"`
    );
    const response = await fetch(requestUrl, {
      method,
      headers,
      body,
      agent: new ProxyAgent()
    });

    const responseBody = response.headers.get('Content-Type').includes('json')
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      logger.debug(`Response status is ${response.status}`);
      // Attempt to get additional context. We have observed two different error schemas
      // from BitBucket API responses: `{"error": {"message": "Error message"}}` and
      // `{"error": "Error message"}`, apart from plain text responses like `Bad Request`.
      const { error } = responseBody.error
        ? responseBody
        : { error: responseBody };
      throw new Error(
        `${response.statusText} ${error.message || error}`.trim()
      );
    }

    return responseBody;
  }

  warn(message) {
    logger.warn(message);
  }
}

module.exports = BitbucketCloud;
