const url = require('url');
const { spawn } = require('child_process');
const { resolve } = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');

const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');
const { throttling } = require('@octokit/plugin-throttling');
const tar = require('tar');

const { download, exec } = require('../utils');

const CHECK_TITLE = 'CML Report';
process.env.RUNNER_ALLOW_RUNASROOT = 1;

const {
  GITHUB_REPOSITORY,
  GITHUB_SHA,
  GITHUB_REF,
  GITHUB_HEAD_REF,
  GITHUB_EVENT_NAME
} = process.env;

const branchName = (branch) => {
  if (!branch) return;

  return branch.replace(/refs\/(head|tag)s\//, '');
};

const ownerRepo = (opts) => {
  let owner, repo;
  const { uri } = opts;

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

  const throttleHandler = (retryAfter, options) => {
    if (options.request.retryCount <= 5) {
      console.log(`Retrying after ${retryAfter} seconds!`);
      return true;
    }
  };
  const octokitOptions = {
    auth: token,
    throttle: {
      onRateLimit: throttleHandler,
      onAbuseLimit: throttleHandler
    }
  };

  if (!repo.includes('github.com')) {
    // GitHub Enterprise, use the: repo URL host + '/api/v3' - as baseURL
    // as per: https://developer.github.com/enterprise/v3/enterprise-admin/#endpoint-urls
    const { host } = new url.URL(repo);
    octokitOptions.baseUrl = `https://${host}/api/v3`;
  }

  const MyOctokit = Octokit.plugin(throttling);
  return new MyOctokit(octokitOptions);
};

class Github {
  constructor(opts = {}) {
    const { repo, token } = opts;

    if (!repo) throw new Error('repo not found');
    if (!token) throw new Error('token not found');

    this.repo = repo;
    this.token = token;
  }

  ownerRepo(opts = {}) {
    const { uri = this.repo } = opts;
    return ownerRepo({ uri });
  }

  async commentCreate(opts = {}) {
    const { report: body, commitSha, update, watermark } = opts;

    const { paginate, repos } = octokit(this.token, this.repo);

    const existing = Object.values(
      await paginate(repos.listCommentsForCommit, {
        ...ownerRepo({ uri: this.repo }),
        commit_sha: commitSha
      })
    )
      .filter((comment) => {
        const { body = '' } = comment;
        return body.endsWith(watermark);
      })
      .sort((first, second) => first.id < second.id)
      .pop();

    if (update && existing) {
      return (
        await repos.updateCommitComment({
          ...ownerRepo({ uri: this.repo }),
          comment_id: existing.id,
          body
        })
      ).data.html_url;
    } else {
      return (
        await repos.createCommitComment({
          ...ownerRepo({ uri: this.repo }),
          commit_sha: commitSha,
          body
        })
      ).data.html_url;
    }
  }

  async checkCreate(opts = {}) {
    const {
      report,
      headSha,
      title = CHECK_TITLE,
      started_at = new Date(),
      completed_at = new Date(),
      conclusion = 'success',
      status = 'completed'
    } = opts;

    const name = title;
    return await octokit(this.token, this.repo).checks.create({
      ...ownerRepo({ uri: this.repo }),
      head_sha: headSha,
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

  async runnerToken() {
    const { owner, repo } = ownerRepo({ uri: this.repo });
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

  async registerRunner() {
    throw new Error('Github does not support registerRunner!');
  }

  async unregisterRunner(opts) {
    const { runnerId } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);

    if (typeof repo !== 'undefined') {
      await actions.deleteSelfHostedRunnerFromRepo({
        owner,
        repo,
        runner_id: runnerId
      });
    } else {
      await actions.deleteSelfHostedRunnerFromOrg({
        org: owner,
        runner_id: runnerId
      });
    }
  }

  async startRunner(opts) {
    const { workdir, single, name, labels } = opts;

    try {
      const runnerCfg = resolve(workdir, '.runner');

      try {
        await fs.unlink(runnerCfg);
      } catch (e) {
        const arch = process.platform === 'darwin' ? 'osx-x64' : 'linux-x64';
        const { tag_name: ver } = await (
          await fetch(
            'https://api.github.com/repos/actions/runner/releases/latest'
          )
        ).json();
        const destination = resolve(workdir, 'actions-runner.tar.gz');
        const url = `https://github.com/actions/runner/releases/download/${ver}/actions-runner-${arch}-${ver.substring(
          1
        )}.tar.gz`;
        await download({ url, path: destination });
        await tar.extract({ file: destination, cwd: workdir });
        await exec(`chmod -R 777 ${workdir}`);
      }

      await exec(
        `${resolve(
          workdir,
          'config.sh'
        )} --unattended  --token "${await this.runnerToken()}" --url "${
          this.repo
        }"  --name "${name}" --labels "${labels}" --work "${resolve(
          workdir,
          '_work'
        )}"`
      );

      return spawn(resolve(workdir, 'run.sh') + (single ? ' --once' : ''), {
        shell: true
      });
    } catch (err) {
      throw new Error(`Failed preparing GitHub runner: ${err.message}`);
    }
  }

  async runners(opts = {}) {
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { paginate, actions } = octokit(this.token, this.repo);

    let runners;
    if (typeof repo === 'undefined') {
      runners = await paginate(actions.listSelfHostedRunnersForOrg, {
        org: owner,
        per_page: 100
      });
    } else {
      runners = await paginate(actions.listSelfHostedRunnersForRepo, {
        owner,
        repo,
        per_page: 100
      });
    }

    return runners.map(({ id, name, busy, status, labels }) => ({
      id,
      name,
      labels: labels.map(({ name }) => name),
      online: status === 'online',
      busy
    }));
  }

  async prCreate(opts = {}) {
    const { source: head, target: base, title, description: body } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { pulls } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl }
    } = await pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body
    });

    return htmlUrl;
  }

  async prs(opts = {}) {
    const { state = 'open' } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { pulls } = octokit(this.token, this.repo);

    const { data: prs } = await pulls.list({
      owner,
      repo,
      state
    });

    return prs.map((pr) => {
      const {
        html_url: url,
        head: { ref: source },
        base: { ref: target }
      } = pr;
      return {
        url,
        source: branchName(source),
        target: branchName(target)
      };
    });
  }

  async pipelineJobs(opts = {}) {
    const { jobs: runnerJobs } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);

    const jobs = await Promise.all(
      runnerJobs.map(async (job) => {
        const { data } = await actions.getJobForWorkflowRun({
          owner,
          repo,
          job_id: job.id
        });

        return data;
      })
    );

    return jobs.map((job) => {
      const { id, started_at: date, run_id: runId, status } = job;
      return { id, date, runId, status };
    });
  }

  async job(opts = {}) {
    const { time, status = 'queued' } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);

    const {
      data: { workflow_runs: workflowRuns }
    } = await actions.listWorkflowRunsForRepo({
      owner,
      repo,
      status
    });

    let runJobs = await Promise.all(
      workflowRuns.map(async (run) => {
        const {
          data: { jobs }
        } = await actions.listJobsForWorkflowRun({
          owner,
          repo,
          run_id: run.id,
          status
        });

        return jobs;
      })
    );

    runJobs = [].concat.apply([], runJobs).map((job) => {
      const { id, started_at: date, run_id: runId } = job;
      return { id, date, runId };
    });

    const job = runJobs.reduce((prev, curr) => {
      const diffTime = (job) => Math.abs(new Date(job.date).getTime() - time);
      return diffTime(curr) < diffTime(prev) ? curr : prev;
    });

    return job;
  }

  async pipelineRestart(opts = {}) {
    const { jobId } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo);

    const {
      data: { run_id: runId }
    } = await actions.getJobForWorkflowRun({
      owner,
      repo,
      job_id: jobId
    });

    try {
      await actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: runId
      });
    } catch (err) {
      // HANDLES: Cannot cancel a workflow run that is completed.
    }

    const {
      data: { status }
    } = await actions.getWorkflowRun({
      owner,
      repo,
      run_id: runId
    });

    if (status !== 'queued') {
      try {
        await actions.reRunWorkflow({
          owner,
          repo,
          run_id: runId
        });
      } catch (err) {}
    }
  }

  get sha() {
    if (GITHUB_EVENT_NAME === 'pull_request')
      return github.context.payload.pull_request.head.sha;

    return GITHUB_SHA;
  }

  get branch() {
    return branchName(GITHUB_HEAD_REF || GITHUB_REF);
  }

  get userEmail() {
    return 'action@github.com';
  }

  get userName() {
    return 'GitHub Action';
  }
}

module.exports = Github;
