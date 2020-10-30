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

const octokit = (token, octokitOptions) => {
  if (!token) throw new Error('token not found');

  return github.getOctokit(token, octokitOptions);
};

class Github {
  constructor(opts = {}) {
    const { repo, token, options } = opts;

    if (!repo) throw new Error('repo not found');
    if (!token) throw new Error('token not found');

    this.repo = repo;
    this.token = token;
    this.octokitOptions = options;
  }

  owner_repo(opts = {}) {
    const { uri = this.repo } = opts;
    return owner_repo({ uri });
  }

  async comment_create(opts = {}) {
    const { report: body, commit_sha } = opts;

    const { url: commit_url } = await octokit(
      this.token,
      this.octokitOptions
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
    return await octokit(this.token, this.octokitOptions).checks.create({
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
    const { actions } = octokit(this.token, this.octokitOptions);

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

  async unregister_runner(opts) {
    const { name } = opts;
    const { owner, repo } = owner_repo({ uri: this.repo });
    const { actions } = octokit(this.token);
    const { id: runner_id } = await this.runner_by_name({ name });

    if (typeof repo !== 'undefined') {
      await actions.deleteSelfHostedRunnerFromRepo({
        owner,
        repo,
        runner_id
      });
    } else {
      await actions.deleteSelfHostedRunnerFromOrg({
        org: owner,
        runner_id
      });
    }
  }

  async runner_by_name(opts = {}) {
    const { name } = opts;
    const { owner, repo } = owner_repo({ uri: this.repo });
    const { actions } = octokit(this.token);
    let runners = [];

    if (typeof repo !== 'undefined') {
      ({
        data: { runners }
      } = await actions.listSelfHostedRunnersForRepo({
        owner,
        repo,
        per_page: 100
      }));
    } else {
      ({
        data: { runners }
      } = await actions.listSelfHostedRunnersForOrg({
        org: owner,
        per_page: 100
      }));
    }

    const runner = runners.filter((runner) => runner.name === name)[0];

    if (runner) return { id: runner.id, name: runner.name };
    return runners.filter((runner) => runner.name === name)[0];
  }
}

module.exports = Github;
