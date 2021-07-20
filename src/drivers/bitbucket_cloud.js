const fetch = require('node-fetch');
const { URL } = require('url');

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
    const { commitSha, report, update, watermark } = opts;

    // Check for a corresponding PR. If it exists, also put the comment there.
    let prs;
    try {
      const getPrEndpoint = `/repositories/${projectPath}/commit/${commitSha}/pullrequests`;
      prs = await this.paginatedRequest({ endpoint: getPrEndpoint });
    } catch (err) {
      if (err.message === 'Not Found Resource not found')
        err.message =
          "Click 'Go to pull request' on any commit details page to enable this API";
      throw err;
    }

    if (prs && prs.length) {
      for (const pr of prs) {
        // Append a watermark to the report with a link to the commit
        const commitLink = commitSha.substr(0, 7);
        const longReport = `${commitLink}\n\n${report}`;
        const prBody = JSON.stringify({ content: { raw: longReport } });

        // Write a comment on the PR
        const prEndpoint = `/repositories/${projectPath}/pullrequests/${pr.id}/comments/`;
        const existingPr = (
          await this.paginatedRequest({ endpoint: prEndpoint, method: 'GET' })
        )
          .filter((comment) => {
            const { content: { raw = '' } = {} } = comment;
            return raw.endsWith(watermark);
          })
          .sort((first, second) => first.id < second.id)
          .pop();
        await this.request({
          endpoint: prEndpoint + (update && existingPr ? existingPr.id : ''),
          method: update && existingPr ? 'PUT' : 'POST',
          body: prBody
        });
      }
    }

    const commitEndpoint = `/repositories/${projectPath}/commit/${commitSha}/comments/`;

    const existingCommmit = (
      await this.paginatedRequest({ endpoint: commitEndpoint, method: 'GET' })
    )
      .filter((comment) => {
        const { content: { raw = '' } = {} } = comment;
        return raw.endsWith(watermark);
      })
      .sort((first, second) => first.id < second.id)
      .pop();

    return (
      await this.request({
        endpoint:
          commitEndpoint +
          (update && existingCommmit ? existingCommmit.id : ''),
        method: update && existingCommmit ? 'PUT' : 'POST',
        body: JSON.stringify({ content: { raw: report } })
      })
    ).links.html.href;
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

  async pipelineRestart(opts = {}) {
    throw new Error('BitBucket Cloud does not support workflowRestart!');
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
    const response = await fetch(url || `${api}${endpoint}`, {
      method,
      headers,
      body
    });

    if (response.status > 300) {
      const {
        error: { message }
      } = await response.json();
      throw new Error(`${response.statusText} ${message}`);
    }

    return await response.json();
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
