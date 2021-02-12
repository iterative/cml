const url = require('url');
const { spawn } = require('child_process');
const { resolve } = require('path');
const fs = require('fs').promises;

const github = require('@actions/github');
const targz = require('tar.gz');

const { download, exec } = require('../utils');

const CHECK_TITLE = 'CML Report';
process.env.RUNNER_ALLOW_RUNASROOT = 1;

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

const octokit = (token, repo) => {
  if (!token) throw new Error('token not found');

  const octokit_options = {};

  if (!repo.includes('github.com')) {
    // GitHub Enterprise, use the: repo URL host + '/api/v3' - as baseURL
    // as per: https://developer.github.com/enterprise/v3/enterprise-admin/#endpoint-urls
    const { host } = new url.URL(repo);
    octokit_options.baseUrl = `https://${host}/api/v3`;
  }

  return github.getOctokit(token, octokit_options);
};

class Github {
  constructor(opts = {}) {
    const { repo, token } = opts;

    if (!repo) throw new Error('repo not found');
    if (!token) throw new Error('token not found');

    this.repo = repo;
    this.token = token;
  }

  owner_repo(opts = {}) {
    const { uri = this.repo } = opts;
    return owner_repo({ uri });
  }

  async comment_create(opts = {}) {
    const { report: body, commit_sha } = opts;

    const { url: commit_url } = await octokit(
      this.token,
      this.repo
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
    return await octokit(this.token, this.repo).checks.create({
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
    const { actions } = octokit(this.token, this.repo);

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

  async register_runner() {
    throw new Error('Github does not support register_runner!');
  }

  async unregister_runner(opts) {
    const { name } = opts;
    const { owner, repo } = owner_repo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);
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

  async start_runner(opts) {
    const { workdir, single, name, labels } = opts;

    try {
      const runner_cfg = resolve(workdir, '.runner');

      try {
        await fs.unlink(runner_cfg);
      } catch (e) {
        const arch = process.platform === 'darwin' ? 'osx-x64' : 'linux-x64';
        const ver = '2.274.2';
        const tar = resolve(workdir, 'actions-runner.tar.gz');
        const url = `https://github.com/actions/runner/releases/download/v${ver}/actions-runner-${arch}-${ver}.tar.gz`;
        await download({ url, path: tar });
        await targz().extract(tar, workdir);
        await exec(`chmod -R 777 ${workdir}`);
      }

      await exec(
        `${resolve(
          workdir,
          'config.sh'
        )} --token "${await this.runner_token()}" --url "${
          this.repo
        }"  --name "${name}" --labels "${labels}" --work "${resolve(
          workdir,
          '_work'
        )}"`
      );

      return spawn(
        resolve(workdir, 'run.sh') + (single ? ' --once' : ''),
        { shell: true }
      );
    } catch (err) {
      throw new Error(`Failed preparing GitHub runner: ${err.message}`);
    }
  }

  async runner_by_name(opts = {}) {
    const { name } = opts;
    const { owner, repo } = owner_repo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);
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
  }
}

module.exports = Github;
