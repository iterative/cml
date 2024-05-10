const url = require('url');
const { spawn } = require('child_process');
const { resolve } = require('path');
const fs = require('fs').promises;
const fetch = require('node-fetch');

const github = require('@actions/github');
const { Octokit } = require('@octokit/rest');
const { withCustomRequest } = require('@octokit/graphql');
const { throttling } = require('@octokit/plugin-throttling');
const tar = require('tar');
const { ProxyAgent } = require('proxy-agent');

const { download, exec, sleep } = require('../utils');
const { logger } = require('../logger');

const CHECK_TITLE = 'CML Report';
process.env.RUNNER_ALLOW_RUNASROOT = 1;

const {
  CI,
  GITHUB_EVENT_NAME,
  GITHUB_HEAD_REF,
  GITHUB_REF,
  GITHUB_REPOSITORY,
  GITHUB_RUN_ID,
  GITHUB_SHA,
  GITHUB_TOKEN,
  GITHUB_WORKFLOW,
  TPI_TASK
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

const octokit = (token, repo, log) => {
  if (!token) throw new Error('token not found');

  const throttleHandler = (reason, offset) => async (retryAfter, options) => {
    if (options.request.retryCount <= 5) {
      logger.info(
        `Retrying because of ${reason} in ${retryAfter + offset} seconds`
      );
      await new Promise((resolve) => setTimeout(resolve, offset * 1000));
      return true;
    }
  };
  const octokitOptions = {
    request: { agent: new ProxyAgent() },
    auth: token,
    log,
    throttle: {
      onAbuseLimit: throttleHandler('abuse limit', 120), // deprecated, see onSecondaryRateLimit
      onRateLimit: throttleHandler('rate limit', 30),
      onSecondaryRateLimit: throttleHandler('secondary rate limit', 30)
    }
  };
  const { host, hostname } = new url.URL(repo);
  if (hostname !== 'github.com') {
    // GitHub Enterprise, use the: repo URL host + '/api/v3' - as baseURL
    // as per: https://developer.github.com/enterprise/v3/enterprise-admin/#endpoint-urls
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

  async user({ name: username } = {}) {
    const { users } = octokit(this.token, this.repo);
    const { data: user } = await users.getByUsername({ username });

    return user;
  }

  async commitCommentCreate(opts = {}) {
    const { report: body, commitSha } = opts;
    const { repos } = octokit(this.token, this.repo);

    return (
      await repos.createCommitComment({
        ...ownerRepo({ uri: this.repo }),
        commit_sha: commitSha,
        body
      })
    ).data.html_url;
  }

  async commitCommentUpdate(opts = {}) {
    const { report: body, id } = opts;
    const { repos } = octokit(this.token, this.repo);

    return (
      await repos.updateCommitComment({
        ...ownerRepo({ uri: this.repo }),
        comment_id: id,
        body
      })
    ).data.html_url;
  }

  async commitComments(opts = {}) {
    const { commitSha } = opts;
    const { repos, paginate } = octokit(this.token, this.repo);

    return (
      await paginate(repos.listCommentsForCommit, {
        ...ownerRepo({ uri: this.repo }),
        commit_sha: commitSha
      })
    ).map(({ id, body }) => {
      return { id, body };
    });
  }

  async commitPrs(opts = {}) {
    const { commitSha, state = 'open' } = opts;
    const { repos } = octokit(this.token, this.repo);

    return (
      await repos.listPullRequestsAssociatedWithCommit({
        ...ownerRepo({ uri: this.repo }),
        commit_sha: commitSha,
        state
      })
    ).data.map((pr) => {
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

  async checkCreate(opts = {}) {
    const {
      report,
      headSha,
      title = CHECK_TITLE,
      started_at: startedAt = new Date(),
      completed_at: completedAt = new Date(),
      conclusion = 'success',
      status = 'completed'
    } = opts;

    const warning =
      'This command only works inside a Github runner or a Github app.';

    if (!CI || TPI_TASK) logger.warn(warning);
    if (GITHUB_TOKEN && GITHUB_TOKEN !== this.token)
      logger.warn(
        `Your token is different than the GITHUB_TOKEN, this command does not work with PAT. ${warning}`
      );

    const name = title;
    return await octokit(this.token, this.repo).checks.create({
      ...ownerRepo({ uri: this.repo }),
      head_sha: headSha,
      started_at: startedAt,
      completed_at: completedAt,
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
    const { actions } = octokit(this.token, this.repo, logger);

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
    const { actions } = octokit(this.token, this.repo, logger);

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
    const { workdir, single, name, labels, env } = opts;

    this.warn(
      'cloud credentials are no longer available on self-hosted runner steps; please use step.env and secrets instead'
    );

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
      }

      await exec(
        resolve(workdir, 'config.sh'),
        '--unattended',
        '--token',
        await this.runnerToken(),
        '--url',
        this.repo,
        '--name',
        name,
        '--labels',
        labels,
        '--work',
        resolve(workdir, '_work'),
        // adds `--ephemeral` to the array only if `single` is set
        ...(single ? ['--ephemeral'] : [])
      );

      return spawn(resolve(workdir, 'run.sh'), {
        shell: true,
        env
      });
    } catch (err) {
      throw new Error(`Failed preparing GitHub runner: ${err.message}`);
    }
  }

  async runners(opts = {}) {
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { paginate, actions } = octokit(this.token, this.repo, logger);

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

    return runners.map((runner) => this.parseRunner(runner));
  }

  async runnerById(opts = {}) {
    const { id } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo, logger);

    if (typeof repo === 'undefined') {
      const { data: runner } = await actions.getSelfHostedRunnerForOrg({
        org: owner,
        runner_id: id
      });

      return this.parseRunner(runner);
    }

    const { data: runner } = await actions.getSelfHostedRunnerForRepo({
      owner,
      repo,
      runner_id: id
    });

    return this.parseRunner(runner);
  }

  async runnerJob({ runnerId, status = 'queued' } = {}) {
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const octokitClient = octokit(this.token, this.repo, logger);

    if (status === 'running') status = 'in_progress';

    const workflowRuns = await octokitClient.paginate(
      octokitClient.actions.listWorkflowRunsForRepo,
      { owner, repo, status }
    );

    let runJobs = await Promise.all(
      workflowRuns.map(
        async ({ id }) =>
          await octokitClient.paginate(
            octokitClient.actions.listJobsForWorkflowRun,
            { owner, repo, run_id: id, status }
          )
      )
    );

    runJobs = [].concat.apply([], runJobs);

    for (const job of runJobs) {
      const { id } = job;

      while (!job.runner_id) {
        const {
          data: { runner_id: jobRunnerId }
        } = await octokitClient.actions.getJobForWorkflowRun({
          owner,
          repo,
          job_id: id
        });

        job.runner_id = jobRunnerId;
        if (job.runner_id === runnerId) break;
        await sleep(16);
      }
    }

    runJobs = runJobs.map((job) => {
      const { id, started_at: date, run_id: runId, runner_id: runnerId } = job;
      return { id, date, runId, runnerId };
    });

    return runJobs.find((job) => runnerId === job.runnerId);
  }

  runnerLogPatterns() {
    return {
      ready: /Listening for Jobs/,
      job_started: /Running job/,
      job_ended: /completed with result/,
      job_ended_succeded: /completed with result: Succeeded/
    };
  }

  parseRunner(runner) {
    const { id, name, busy, status, labels } = runner;
    return {
      id,
      name,
      labels: labels.map(({ name }) => name),
      online: status === 'online',
      busy
    };
  }

  async prCreate(opts = {}) {
    const {
      source: head,
      target: base,
      title,
      description: body,
      autoMerge
    } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { pulls } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl, number }
    } = await pulls.create({
      owner,
      repo,
      head,
      base,
      title,
      body
    });

    if (autoMerge)
      await this.prAutoMerge({
        pullRequestId: number,
        mergeMode: autoMerge,
        base
      });
    return htmlUrl;
  }

  /**
   * @param {{ branch: string }} opts
   * @returns {Promise<boolean>}
   */
  async isProtected({ branch }) {
    const octo = octokit(this.token, this.repo);
    const { owner, repo } = this.ownerRepo();
    try {
      await octo.repos.getBranchProtection({
        branch,
        owner,
        repo
      });
      return true;
    } catch (error) {
      const errors = [
        'Branch not protected',
        'Upgrade to GitHub Pro or make this repository public to enable this feature.'
      ];
      if (errors.includes(error.message)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * @param {{ pullRequestId: number, base: string }} param0
   * @returns {Promise<void>}
   */
  async prAutoMerge({ pullRequestId, mergeMode, mergeMessage, base }) {
    const octo = octokit(this.token, this.repo);
    const graphql = withCustomRequest(octo.request);
    const { owner, repo } = this.ownerRepo();
    const [commitHeadline, commitBody] = mergeMessage
      ? mergeMessage.split(/\n\n(.*)/s)
      : [];
    const {
      data: { node_id: nodeId }
    } = await octo.pulls.get({ owner, repo, pull_number: pullRequestId });
    try {
      await graphql(
        `
          mutation autoMerge(
            $pullRequestId: ID!
            $mergeMethod: PullRequestMergeMethod
            $commitHeadline: String
            $commitBody: String
          ) {
            enablePullRequestAutoMerge(
              input: {
                pullRequestId: $pullRequestId
                mergeMethod: $mergeMethod
                commitHeadline: $commitHeadline
                commitBody: $commitBody
              }
            ) {
              clientMutationId
            }
          }
        `,
        {
          pullRequestId: nodeId,
          mergeMethod: mergeMode.toUpperCase(),
          commitHeadline,
          commitBody
        }
      );
    } catch (err) {
      const tolerate = [
        "Can't enable auto-merge for this pull request",
        'Pull request Protected branch rules not configured for this branch',
        'Pull request is in clean status'
      ];

      if (!tolerate.some((message) => err.message.includes(message))) throw err;

      const settingsUrl = `https://github.com/${owner}/${repo}/settings`;

      try {
        if (await this.isProtected({ branch: base })) {
          logger.warn(
            `Failed to enable auto-merge: Enable the feature in your repository settings: ${settingsUrl}#merge_types_auto_merge. Trying to merge immediately...`
          );
        } else {
          logger.warn(
            `Failed to enable auto-merge: Set up branch protection and add "required status checks" for branch '${base}': ${settingsUrl}/branches. Trying to merge immediately...`
          );
        }
      } catch (err) {
        if (!err.message.includes('Resource not accessible by integration'))
          throw err;
        logger.warn(
          `Failed to enable auto-merge. Trying to merge immediately...`
        );
      }

      await octo.pulls.merge({
        owner,
        repo,
        pull_number: pullRequestId,
        merge_method: mergeMode,
        commit_title: commitHeadline,
        commit_message: commitBody
      });
    }
  }

  async issueCommentCreate(opts = {}) {
    const { issueId, report } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl }
    } = await issues.createComment({
      owner,
      repo,
      body: report,
      issue_number: issueId
    });

    return htmlUrl;
  }

  async issueCommentUpdate(opts = {}) {
    const { id, report } = opts;
    if (!id) throw new Error('Id is missing updating comment');
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl }
    } = await issues.updateComment({
      owner,
      repo,
      body: report,
      comment_id: id
    });

    return htmlUrl;
  }

  async issueComments(opts = {}) {
    const { issueId } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const { data: comments } = await issues.listComments({
      owner,
      repo,
      issue_number: issueId
    });

    return comments.map(({ id, body }) => {
      return { id, body };
    });
  }

  async prCommentCreate(opts = {}) {
    const { report: body, prNumber } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl }
    } = await issues.createComment({
      owner,
      repo,
      body,
      issue_number: prNumber
    });

    return htmlUrl;
  }

  async prCommentUpdate(opts = {}) {
    const { report: body, id } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const {
      data: { html_url: htmlUrl }
    } = await issues.updateComment({
      owner,
      repo,
      body,
      comment_id: id
    });

    return htmlUrl;
  }

  async prComments(opts = {}) {
    const { prNumber } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { issues } = octokit(this.token, this.repo);

    const { data: comments } = await issues.listComments({
      owner,
      repo,
      issue_number: prNumber
    });

    return comments.map(({ id, body }) => {
      return { id, body };
    });
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

  async pipelineRerun({ id = GITHUB_RUN_ID, jobId } = {}) {
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo, logger);

    if (!id && jobId) {
      ({
        data: { run_id: id }
      } = await actions.getJobForWorkflowRun({
        owner,
        repo,
        job_id: jobId
      }));
    }

    let {
      data: { status }
    } = await actions.getWorkflowRun({
      owner,
      repo,
      run_id: id
    });

    if (status === 'in_progress') {
      await actions.cancelWorkflowRun({
        owner,
        repo,
        run_id: id
      });

      while (status === 'in_progress') {
        ({
          data: { status }
        } = await actions.getWorkflowRun({
          owner,
          repo,
          run_id: id
        }));
        await sleep(1);
      }
    }

    await actions.reRunWorkflow({
      owner,
      repo,
      run_id: id
    });
  }

  async pipelineJobs(opts = {}) {
    const { jobs: runnerJobs } = opts;
    const { owner, repo } = ownerRepo({ uri: this.repo });
    const { actions } = octokit(this.token, this.repo, logger);

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

  async updateGitConfig({ userName, userEmail, remote } = {}) {
    const repo = new URL(this.repo);
    repo.password = this.token;
    repo.username = 'token';

    return [
      ['git', 'config', '--unset', 'http.https://github.com/.extraheader'],
      ['git', 'config', 'user.name', userName || this.userName],
      ['git', 'config', 'user.email', userEmail || this.userEmail],
      [
        'git',
        'remote',
        'set-url',
        remote,
        repo.toString() + (repo.toString().endsWith('.git') ? '' : '.git')
      ]
    ];
  }

  get workflowId() {
    return GITHUB_WORKFLOW;
  }

  get runId() {
    return GITHUB_RUN_ID;
  }

  warn(message) {
    console.error(`::warning::${message}`);
  }

  get sha() {
    if (GITHUB_EVENT_NAME === 'pull_request')
      return github.context.payload.pull_request.head.sha;

    return GITHUB_SHA;
  }

  /**
   * Returns the PR number if we're in a PR-related action event.
   */
  get pr() {
    if (['pull_request', 'pull_request_target'].includes(GITHUB_EVENT_NAME)) {
      return github.context.payload.pull_request.number;
    }
    return null;
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
