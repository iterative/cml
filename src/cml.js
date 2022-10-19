const { execSync, spawnSync } = require('child_process');
const gitUrlParse = require('git-url-parse');
const stripAuth = require('strip-url-auth');
const globby = require('globby');
const git = require('simple-git')('./');
const path = require('path');
const fs = require('fs').promises;
const chokidar = require('chokidar');
const winston = require('winston');
const remark = require('remark');
const visit = require('unist-util-visit');

const Gitlab = require('./drivers/gitlab');
const Github = require('./drivers/github');
const BitbucketCloud = require('./drivers/bitbucket_cloud');
const {
  upload,
  exec,
  watermarkUri,
  preventcacheUri,
  waitForever
} = require('./utils');

const { GITHUB_REPOSITORY, CI_PROJECT_URL, BITBUCKET_REPO_UUID } = process.env;

const GIT_USER_NAME = 'Olivaw[bot]';
const GIT_USER_EMAIL = 'olivaw@iterative.ai';
const GIT_REMOTE = 'origin';
const GITHUB = 'github';
const GITLAB = 'gitlab';
const BB = 'bitbucket';

const watcher = chokidar.watch([], {
  persistent: true,
  followSymlinks: true,
  disableGlobbing: true,
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 2000,
    pollInterval: 500
  }
});

const uriNoTrailingSlash = (uri) => {
  return uri.endsWith('/') ? uri.substr(0, uri.length - 1) : uri;
};

const gitRemoteUrl = (opts = {}) => {
  const { remote = GIT_REMOTE } = opts;
  const url = gitUrlParse(
    execSync(`git config --get remote.${remote}.url`).toString('utf8')
  );
  return stripAuth(url.toString(url.protocol === 'http' ? 'http' : 'https'));
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
    const url = new URL(repo);
    if (url.hostname === 'github.com') return GITHUB;
    if (url.hostname === 'gitlab.com') return GITLAB;
    if (/bitbucket\.(com|org)/.test(url.hostname)) return BB;
  }

  if (GITHUB_REPOSITORY) return GITHUB;
  if (CI_PROJECT_URL) return GITLAB;
  if (BITBUCKET_REPO_UUID) return BB;
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
    const { sha } = this.getDriver();
    return sha || (await this.revParse());
  }

  async branch() {
    const { branch } = this.getDriver();
    return branch || (await exec(`git branch --show-current`));
  }

  getDriver() {
    const { driver, repo, token } = this;
    if (!driver) throw new Error('driver not set');

    if (driver === GITHUB) return new Github({ repo, token });
    if (driver === GITLAB) return new Gitlab({ repo, token });
    if (driver === BB) return new BitbucketCloud({ repo, token });

    throw new Error(`driver ${driver} unknown!`);
  }

  async commentCreate(opts = {}) {
    const triggerSha = await this.triggerSha();
    const {
      commitSha: inCommitSha = triggerSha,
      rmWatermark,
      update,
      pr,
      publish,
      publishUrl,
      markdownFile,
      report: testReport,
      watch,
      triggerFile
    } = opts;

    const commitSha =
      (await this.revParse({ ref: inCommitSha })) || inCommitSha;

    if (rmWatermark && update)
      throw new Error('watermarks are mandatory for updateable comments');

    const watermark = rmWatermark
      ? ''
      : '![CML watermark](https://raw.githubusercontent.com/iterative/cml/master/assets/watermark.svg)';

    let userReport = testReport;
    try {
      if (!userReport) {
        userReport = await fs.readFile(markdownFile, 'utf-8');
      }
    } catch (err) {
      if (!watch) throw err;
    }

    let report = `${userReport}\n\n${watermark}`;
    const drv = this.getDriver();

    const publishLocalFiles = async (tree) => {
      const nodes = [];

      visit(tree, ['definition', 'image', 'link'], (node) => nodes.push(node));

      const visitor = async (node) => {
        if (node.url && node.alt !== 'CML watermark') {
          const absolutePath = path.resolve(
            path.dirname(markdownFile),
            node.url
          );
          if (!triggerFile && watch) watcher.add(absolutePath);
          try {
            node.url = await this.publish({
              ...opts,
              path: absolutePath,
              url: publishUrl
            });
          } catch (err) {
            if (err.code !== 'ENOENT') throw err;
          }
        }
      };

      await Promise.all(nodes.map(visitor));
    };

    if (publish) {
      report = (
        await remark()
          .use(() => publishLocalFiles)
          .process(report)
      )
        .toString()
        .replace(/\\&(.+)=/g, '&$1=');
    }

    if (watch) {
      let first = true;
      let lock = false;
      watcher.add(triggerFile || markdownFile);
      watcher.on('all', async (event, path) => {
        if (lock) return;
        lock = true;
        try {
          winston.info(`watcher event: ${event} ${path}`);
          await this.commentCreate({
            ...opts,
            update: update || !first,
            watch: false
          });
          if (event !== 'unlink' && path === triggerFile) {
            await fs.unlink(triggerFile);
          }
        } catch (err) {
          winston.warn(err);
        }
        first = false;
        lock = false;
      });
      winston.info('watching for file changes...');
      await waitForever();
    }

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

    if (update) {
      comment = updatableComment(await drv.commitComments({ commitSha }));

      if (comment)
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

    return await this.getDriver().checkCreate({ ...opts, headSha });
  }

  async publish(opts = {}) {
    const { title = '', md, native, rmWatermark } = opts;

    let mime, uri;
    if (native) {
      ({ mime, uri } = await this.getDriver().upload(opts));
    } else {
      ({ mime, uri } = await upload(opts));
    }

    if (!rmWatermark) {
      const [, type] = mime.split('/');
      uri = watermarkUri({ uri, type });
    }

    uri = preventcacheUri({ uri });

    if (md && mime.match('(image|video)/.*'))
      return `![](${uri}${title ? ` "${title}"` : ''})`;

    if (md) return `[${title}](${uri})`;

    return uri;
  }

  async runnerToken() {
    return await this.getDriver().runnerToken();
  }

  async parseRunnerLog(opts = {}) {
    let { data, name } = opts;
    if (!data) return [];

    data = data.toString('utf8');

    const parseId = (key) => {
      if (patterns[key]) {
        const regex = patterns[key];
        const matches = regex.exec(data) || [];
        return matches[1];
      }
    };

    const driver = await this.getDriver();
    const logs = [];
    const patterns = driver.runnerLogPatterns();
    for (const status of ['ready', 'job_started', 'job_ended']) {
      const regex = patterns[status];
      if (regex.test(data)) {
        const date = new Date();
        const log = {
          status,
          date: date.toISOString(),
          repo: this.repo
        };

        if (status === 'job_started') {
          log.job = parseId('job');
          log.pipeline = parseId('pipeline');

          if (name && this.driver === GITHUB) {
            const { id: runnerId } = await this.runnerByName({ name });
            const { id } = await driver.runnerJob({ runnerId });
            log.job = id;
          }
        }

        if (status === 'job_ended')
          log.success = patterns.job_ended_succeded.test(data);

        log.level = log.success ? 'info' : 'error';
        logs.push(log);
      }
    }

    return logs;
  }

  async startRunner(opts = {}) {
    return await this.getDriver().startRunner(opts);
  }

  async registerRunner(opts = {}) {
    return await this.getDriver().registerRunner(opts);
  }

  async unregisterRunner(opts = {}) {
    const { id: runnerId } = (await this.runnerByName(opts)) || {};
    if (!runnerId) throw new Error(`Runner not found`);

    return await this.getDriver().unregisterRunner({ runnerId, ...opts });
  }

  async runners(opts = {}) {
    return await this.getDriver().runners(opts);
  }

  async runnerByName(opts = {}) {
    let { name, runners } = opts;

    if (!runners) runners = await this.runners(opts);

    return runners.find((runner) => runner.name === name);
  }

  async runnerById(opts = {}) {
    return await this.getDriver().runnerById(opts);
  }

  async runnersByLabels(opts = {}) {
    let { labels, runners } = opts;

    if (!runners) runners = await this.runners(opts);

    return runners.filter((runner) =>
      labels.split(',').every((label) => runner.labels.includes(label))
    );
  }

  async runnerJob({ name, status = 'running' } = {}) {
    return await this.getDriver().runnerJob({ status, name });
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
    let {
      fetchDepth = 1,
      unshallow = false,
      userEmail = GIT_USER_EMAIL,
      userName = GIT_USER_NAME,
      remote = GIT_REMOTE
    } = opts;

    if (isNaN(fetchDepth) || fetchDepth < 0) {
      fetchDepth = 0;
    }

    const driver = this.getDriver();
    await exec(await driver.updateGitConfig({ userName, userEmail, remote }));
    if (unshallow) {
      if ((await exec('git rev-parse --is-shallow-repository')) === 'true') {
        await exec('git fetch --unshallow');
      }
    }
    await exec(`git fetch --all --depth=${fetchDepth}`);
  }

  async prCreate(opts = {}) {
    const driver = this.getDriver();
    const {
      remote = GIT_REMOTE,
      globs = ['dvc.lock', '.gitignore'],
      md,
      skipCi,
      branch,
      message,
      title,
      body,
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
    const source = branch || `${target}-cml-pr-${shaShort}`;

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
      let commitMessage = message || `CML PR for ${shaShort}`;
      if (skipCi || (!message && !(merge || rebase || squash))) {
        commitMessage += ' [skip ci]';
      }
      await exec(`git commit -m "${commitMessage}"`);
      await exec(`git push --set-upstream ${remote} ${source}`);
    }

    const url = await driver.prCreate({
      source,
      target,
      title: title || `CML PR for ${target} ${shaShort}`,
      description:
        body ||
        `
Automated commits for ${this.repo}/commit/${sha} created by CML.
      `,
      skipCi,
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
    return await this.getDriver().pipelineRerun(opts);
  }

  async pipelineJobs(opts) {
    return await this.getDriver().pipelineJobs(opts);
  }

  logError(e) {
    winston.error(e.message);
  }
}

module.exports = {
  CML,
  default: CML,
  GIT_USER_EMAIL,
  GIT_USER_NAME,
  GIT_REMOTE
};
