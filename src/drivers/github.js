const url = require('url');
const github = require('@actions/github');

const CHECK_TITLE = 'CML Report';

const owner_repo = (opts) => {
  let owner, repo;
  const { uri } = opts;
  const { GITHUB_REPOSITORY } = process.env;

  if (uri) {
    const { pathname } = new URL(uri);
    [owner, repo] = pathname.substr(1).split('/');
  } else if (GITHUB_REPOSITORY) {
    [owner, repo] = GITHUB_REPOSITORY.split('/');
  }

  return { owner, repo };
};

const octokit = (token, octokit_options) => {
  if (!token) throw new Error('token not found');

  return github.getOctokit(token, octokit_options);
};

class Github {
  constructor(opts = {}) {
    const { repo, token } = opts;

    if (!repo) throw new Error('repo not found');
    if (!token) throw new Error('token not found');

    this.repo = repo;
    this.token = token;
    this.octokit_options = {};

    if (!repo.includes('github.com')) {
      const repo_url = url.parse(repo);

      this.octokit_options['baseUrl'] = 'https://' + repo_url.host + '/api/v3';
    }
  }

  owner_repo(opts = {}) {
    const { uri = this.repo } = opts;
    return owner_repo({ uri });
  }

  async comment_create(opts = {}) {
    const { report: body, commit_sha } = opts;

    const { url: commit_url } = await octokit(
      this.token,
      this.octokit_options
    ).repos.createCommitComment({
      ...owner_repo({ uri: this.repo }),
      body,
      commit_sha
    });

    return commit_url;
  }

  async check_create(opts = {}) {
    const {
      report,
      head_sha,
      title = CHECK_TITLE,
      started_at = new Date(),
      completed_at = new Date(),
      conclusion = 'success',
      status = 'completed'
    } = opts;

    const name = title;
    return await octokit(this.token, this.octokit_options).checks.create({
      ...owner_repo({ uri: this.repo }),
      head_sha,
      started_at,
      completed_at,
      conclusion,
      status,
      name,
      output: { title, summary: report }
    });
  }

  async upload() {
    throw new Error('Github does not support publish!');
  }

  async runner_token() {
    const { owner, repo } = owner_repo({ uri: this.repo });
    const { actions } = octokit(this.token, this.octokit_options);

    if (typeof repo !== 'undefined') {
      const {
        data: { token }
      } = await actions.createRegistrationTokenForRepo({
        owner,
        repo
      });

      return token;
    }

    const {
      data: { token }
    } = await actions.createRegistrationTokenForOrg({
      org: owner
    });

    return token;
  }

  async register_runner(opts = {}) {
    throw new Error('Github does not support register_runner!');
  }
}

module.exports = Github;
