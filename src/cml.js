const { execSync, spawnSync } = require('child_process');
const gitUrlParse = require('git-url-parse');
const stripAuth = require('strip-url-auth');
const globby = require('globby');
const git = require('simple-git')('./');
const path = require('path');

const winston = require('winston');

const Gitlab = require('./drivers/gitlab');
const Github = require('./drivers/github');
const BitbucketCloud = require('./drivers/bitbucket_cloud');
const { upload, exec, watermarkUri } = require('./utils');

const { GITHUB_REPOSITORY, CI_PROJECT_URL, BITBUCKET_REPO_UUID } = process.env;

const GIT_USER_NAME = 'Olivaw[bot]';
const GIT_USER_EMAIL = 'olivaw@iterative.ai';
const GIT_REMOTE = 'origin';
const GITHUB = 'github';
const GITLAB = 'gitlab';
const BB = 'bitbucket';

const uriNoTrailingSlash = (uri) => {
  return uri.endsWith('/') ? uri.substr(0, uri.length - 1) : uri;
};

const gitRemoteUrl = (opts = {}) => {
  const { remote = GIT_REMOTE } = opts;
  const url = execSync(`git config --get remote.${remote}.url`).toString(
    'utf8'
  );
  return stripAuth(gitUrlParse(url).toString('https'));
};

const inferToken = () => {
  const {
    REPO_TOKEN,
    repo_token: repoToken,
    GITHUB_TOKEN,
    GITLAB_TOKEN,
    BITBUCKET_TOKEN
  } = process.env;
  return (
    REPO_TOKEN || repoToken || GITHUB_TOKEN || GITLAB_TOKEN || BITBUCKET_TOKEN
  );
};

const inferDriver = (opts = {}) => {
  const { repo } = opts;
  if (repo) {
    if (repo.includes('github.com')) return GITHUB;
    if (repo.includes('gitlab.com')) return GITLAB;
    if (/bitbucket\.(com|org)/.test(repo)) return BB;
  }

  if (GITHUB_REPOSITORY) return GITHUB;
  if (CI_PROJECT_URL) return GITLAB;
  if (BITBUCKET_REPO_UUID) return BB;
};

const getDriver = (opts) => {
  const { driver, repo, token } = opts;
  if (!driver) throw new Error('driver not set');

  if (driver === GITHUB) return new Github({ repo, token });
  if (driver === GITLAB) return new Gitlab({ repo, token });
  if (driver === BB) return new BitbucketCloud({ repo, token });

  throw new Error(`driver ${driver} unknown!`);
};

const fixGitSafeDirectory = () => {
  const gitConfigSafeDirectory = (value) =>
    spawnSync(
      'git',
      [
        'config',
        '--global',
        value ? '--add' : '--get-all',
        'safe.directory',
        value
      ],
      {
        encoding: 'utf8'
      }
    ).stdout;

  const addSafeDirectory = (directory) =>
    gitConfigSafeDirectory()
      .split(/[\r\n]+/)
      .includes(directory) || gitConfigSafeDirectory(directory);

  // Fix for git>=2.36.0
  addSafeDirectory('*');

  // Fix for git^2.35.2
  addSafeDirectory('/');
  for (
    let root, dir = process.cwd();
    root !== dir;
    { root, dir } = path.parse(dir)
  ) {
    addSafeDirectory(dir);
  }
};

class CML {
  constructor(opts = {}) {
    fixGitSafeDirectory(); // https://github.com/iterative/cml/issues/970

    const { driver, repo, token } = opts;

    this.repo = uriNoTrailingSlash(repo || gitRemoteUrl()).replace(
      /\.git$/,
      ''
    );
    this.token = token || inferToken();
    this.driver = driver || inferDriver({ repo: this.repo });
  }

  async revParse({ ref = 'HEAD' } = {}) {
    try {
      return await exec(`git rev-parse ${ref}`);
    } catch (err) {
      winston.warn(
        'Failed to obtain SHA. Perhaps not in the correct git folder'
      );
    }
  }

  async triggerSha() {
    const { sha } = getDriver(this);
    return sha || (await this.revParse());
  }

  async branch() {
    const { branch } = getDriver(this);
    return branch || (await exec(`git branch --show-current`));
  }

  async commentCreate(opts = {}) {
    const triggerSha = await this.triggerSha();
    const {
      report: userReport,
      commitSha: inCommitSha = triggerSha,
      rmWatermark,
      update,
      pr
    } = opts;

    const commitSha =
      (await this.revParse({ ref: inCommitSha })) || inCommitSha;

    if (rmWatermark && update)
      throw new Error('watermarks are mandatory for updateable comments');

    const watermark = rmWatermark
      ? ''
      : '![CML watermark](https://raw.githubusercontent.com/iterative/cml/master/assets/watermark.svg)';

    const report = `${userReport}\n\n${watermark}`;
    const drv = getDriver(this);

    let comment;
    const updatableComment = (comments) => {
      return comments.reverse().find(({ body }) => {
        return body.includes('watermark.svg');
      });
    };

    const isBB = this.driver === BB;
    if (pr || isBB) {
      let commentUrl;

      if (commitSha !== triggerSha)
        winston.info(
          `Looking for PR associated with --commit-sha="${inCommitSha}".\nSee https://cml.dev/doc/ref/send-comment.`
        );

      const longReport = `${commitSha.substr(0, 7)}\n\n${report}`;
      const [commitPr = {}] = await drv.commitPrs({ commitSha });
      const { url } = commitPr;

      if (!url && !isBB)
        throw new Error(`PR for commit sha "${inCommitSha}" not found`);

      if (url) {
        const [prNumber] = url.split('/').slice(-1);

        if (update)
          comment = updatableComment(await drv.prComments({ prNumber }));

        if (update && comment) {
          commentUrl = await drv.prCommentUpdate({
            report: longReport,
            id: comment.id,
            prNumber
          });
        } else
          commentUrl = await drv.prCommentCreate({
            report: longReport,
            prNumber
          });

        if (this.driver !== 'bitbucket') return commentUrl;
      }
    }

    if (update)
      comment = updatableComment(await drv.commitComments({ commitSha }));

    if (update && comment) {
      return await drv.commentUpdate({
        report,
        id: comment.id,
        commitSha
      });
    }

    return await drv.commentCreate({
      report,
      commitSha
    });
  }

  async checkCreate(opts = {}) {
    const { headSha = await this.triggerSha() } = opts;

    return await getDriver(this).checkCreate({ ...opts, headSha });
  }

  async publish(opts = {}) {
    const { title = '', md, native, rmWatermark } = opts;

    let mime, uri;
    if (native) {
      ({ mime, uri } = await getDriver(this).upload(opts));
    } else {
      ({ mime, uri } = await upload(opts));
    }

    if (!rmWatermark) {
      const [, type] = mime.split('/');
      uri = watermarkUri({ uri, type });
    }

    if (md && mime.match('(image|video)/.*'))
      return `![](${uri}${title ? ` "${title}"` : ''})`;

    if (md) return `[${title}](${uri})`;

    return uri;
  }

  async runnerToken() {
    return await getDriver(this).runnerToken();
  }

  parseRunnerLog(opts = {}) {
    let { data } = opts;
    if (!data) return;

    const date = new Date();

    try {
      data = data.toString('utf8');

      let log = {
        level: 'info',
        date: date.toISOString(),
        repo: this.repo
      };

      if (this.driver === GITHUB) {
        const id = 'gh';
        if (data.includes('Running job')) {
          log.job = id;
          log.status = 'job_started';
        } else if (data.includes('completed with result')) {
          log.job = id;
          log.status = 'job_ended';
          log.success = data.includes('Succeeded');
          log.level = log.success ? 'info' : 'error';
        } else if (data.includes('Listening for Jobs')) {
          log.status = 'ready';
        }

        const [, message] = data.split(/[A-Z]:\s/);
        return { ...log, message: (message || data).replace(/\n/g, '') };
      }

      if (this.driver === GITLAB) {
        const { msg, job, duration_s: duration } = JSON.parse(data);
        log = { ...log, job };

        if (msg.endsWith('received')) {
          log.status = 'job_started';
        } else if (duration) {
          log.status = 'job_ended';
          log.success = msg.includes('Job succeeded');
          log.level = log.success ? 'info' : 'error';
        } else if (msg.includes('Starting runner for')) {
          log.status = 'ready';
        }
        return log;
      }
    } catch (err) {
      winston.warn(`Failed parsing log: ${err.message}`);
      winston.warn(
        `Original log bytes, as Base64: ${Buffer.from(data).toString('base64')}`
      );
    }
  }

  async startRunner(opts = {}) {
    return await getDriver(this).startRunner(opts);
  }

  async registerRunner(opts = {}) {
    return await getDriver(this).registerRunner(opts);
  }

  async unregisterRunner(opts = {}) {
    const { id: runnerId } = await this.runnerByName(opts);
    return await getDriver(this).unregisterRunner({ runnerId, ...opts });
  }

  async runners(opts = {}) {
    return await getDriver(this).runners(opts);
  }

  async runnerByName(opts = {}) {
    let { name, runners } = opts;

    if (!runners) runners = await this.runners(opts);

    return runners.find((runner) => runner.name === name);
  }

  async runnerById(opts = {}) {
    return await getDriver(this).runnerById(opts);
  }

  async runnersByLabels(opts = {}) {
    let { labels, runners } = opts;

    if (!runners) runners = await this.runners(opts);

    return runners.filter((runner) =>
      labels.split(',').every((label) => runner.labels.includes(label))
    );
  }

  async runnerJob(opts = {}) {
    const { runnerId, status = 'running' } = opts;
    return await getDriver(this).job({ status, runnerId });
  }

  async repoTokenCheck() {
    try {
      await this.runnerToken();
    } catch (err) {
      if (err.message === 'Bad credentials')
        err.message += ', REPO_TOKEN should be a personal access token';
      throw err;
    }
  }

  async ci(opts = {}) {
    const {
      unshallow = false,
      userEmail = GIT_USER_EMAIL,
      userName = GIT_USER_NAME
    } = opts;

    const driver = getDriver(this);
    await exec(await driver.updateGitConfig({ userName, userEmail }));
    if (unshallow) {
      if ((await exec('git rev-parse --is-shallow-repository')) === 'true') {
        await exec('git fetch --unshallow');
      }
    }
    await exec('git fetch --all');
  }

  async prCreate(opts = {}) {
    const driver = getDriver(this);
    const {
      remote = GIT_REMOTE,
      globs = ['dvc.lock', '.gitignore'],
      md,
      merge,
      rebase,
      squash
    } = opts;

    await this.ci(opts);

    const renderPr = (url) => {
      if (md)
        return `[CML's ${
          this.driver === GITLAB ? 'Merge' : 'Pull'
        } Request](${url})`;
      return url;
    };

    const { files } = await git.status();
    if (!files.length) {
      winston.warn('No files changed. Nothing to do.');
      return;
    }

    const paths = (await globby(globs)).filter((path) =>
      files.map((file) => file.path).includes(path)
    );
    if (!paths.length) {
      winston.warn('Input files are not affected. Nothing to do.');
      return;
    }

    const sha = await this.triggerSha();
    const shaShort = sha.substr(0, 8);

    const target = await this.branch();
    const source = `${target}-cml-pr-${shaShort}`;

    const branchExists = (
      await exec(
        `git ls-remote $(git config --get remote.${remote}.url) ${source}`
      )
    ).includes(source);

    if (branchExists) {
      const prs = await driver.prs();
      const { url } =
        prs.find(
          (pr) => source.endsWith(pr.source) && target.endsWith(pr.target)
        ) || {};

      if (url) return renderPr(url);
    } else {
      await exec(`git fetch ${remote} ${sha}`);
      await exec(`git checkout -B ${target} ${sha}`);
      await exec(`git checkout -b ${source}`);
      await exec(`git add ${paths.join(' ')}`);
      let commitMessage = `CML PR for ${shaShort}`;
      if (!(merge || rebase || squash)) {
        commitMessage += ' [skip ci]';
      }
      await exec(`git commit -m "${commitMessage}"`);
      await exec(`git push --set-upstream ${remote} ${source}`);
    }

    const title = `CML PR for ${target} ${shaShort}`;
    const description = `
Automated commits for ${this.repo}/commit/${sha} created by CML.
  `;

    const url = await driver.prCreate({
      source,
      target,
      title,
      description,
      autoMerge: merge
        ? 'merge'
        : rebase
        ? 'rebase'
        : squash
        ? 'squash'
        : undefined
    });

    return renderPr(url);
  }

  async pipelineRerun(opts) {
    return await getDriver(this).pipelineRerun(opts);
  }

  async pipelineRestart(opts) {
    return await getDriver(this).pipelineRestart(opts);
  }

  async pipelineJobs(opts) {
    return await getDriver(this).pipelineJobs(opts);
  }

  logError(e) {
    winston.error(e.message);
  }
}

module.exports = {
  CML,
  GIT_USER_EMAIL,
  GIT_USER_NAME,
  GIT_REMOTE,
  default: CML
};
