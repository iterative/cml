const { execSync } = require('child_process');
const git_url_parse = require('git-url-parse');
const strip_auth = require('strip-url-auth');

const Gitlab = require('./drivers/gitlab');
const Github = require('./drivers/github');
const BitBucketCloud = require('./drivers/bitbucket_cloud');
const { upload, exec, watermark_uri } = require('./utils');

const uri_no_trailing_slash = (uri) => {
  return uri.endsWith('/') ? uri.substr(0, uri.length - 1) : uri;
};

const repo_from_origin = () => {
  const origin = execSync('git config --get remote.origin.url').toString(
    'utf8'
  );

  const uri = git_url_parse(origin).toString('https').replace('.git', '');
  return strip_auth(uri);
};

const infer_driver = (opts = {}) => {
  const { repo } = opts;
  if (repo && repo.includes('github.com')) return 'github';
  if (repo && repo.includes('gitlab.com')) return 'gitlab';
  if (repo && repo.includes('bitbucket.com')) return 'bitbucket';

  const {
    GITHUB_REPOSITORY,
    CI_PROJECT_URL,
    BITBUCKET_REPO_UUID
  } = process.env;
  if (GITHUB_REPOSITORY) return 'github';
  if (CI_PROJECT_URL) return 'gitlab';
  if (BITBUCKET_REPO_UUID) return 'bitbucket';
};

const get_driver = (opts) => {
  const { driver, repo, token } = opts;
  if (!driver) throw new Error('driver not set');

  if (driver === 'github') return new Github({ repo, token });
  if (driver === 'gitlab') return new Gitlab({ repo, token });
  if (driver === 'bitbucket') return new BitBucketCloud({ repo, token });

  throw new Error(`driver ${driver} unknown!`);
};

const infer_token = () => {
  const {
    repo_token,
    GITHUB_TOKEN,
    GITLAB_TOKEN,
    BITBUCKET_TOKEN
  } = process.env;
  return repo_token || GITHUB_TOKEN || GITLAB_TOKEN || BITBUCKET_TOKEN;
};

class CML {
  constructor(opts = {}) {
    const { driver, repo, token } = opts;

    this.repo = uri_no_trailing_slash(repo || repo_from_origin());
    this.token = token || infer_token();
    this.driver = driver || infer_driver({ repo: this.repo });
  }

  async head_sha() {
    if (process.env.GITHUB_EVENT_NAME === 'pull_request')
      return require('@actions/github').context.payload.pull_request.head.sha;

    return (await exec(`git rev-parse HEAD`)).replace(/(\r\n|\n|\r)/gm, '');
  }

  async comment_create(opts = {}) {
    const sha = await this.head_sha();
    const { report: user_report, commit_sha = sha, rm_watermark } = opts;
    const watermark = rm_watermark
      ? ''
      : ' \n\n  ![CML watermark](https://raw.githubusercontent.com/iterative/cml/master/assets/watermark.svg)';
    const report = `${user_report}${watermark}`;

    return await get_driver(this).comment_create({
      ...opts,
      report,
      commit_sha
    });
  }

  async check_create(opts = {}) {
    const sha = await this.head_sha();
    opts.head_sha = opts.head_sha || sha;

    return await get_driver(this).check_create(opts);
  }

  async publish(opts = {}) {
    const { title = '', md, native, gitlab_uploads, rm_watermark } = opts;

    let mime, uri;
    if (native || gitlab_uploads) {
      const client = get_driver(this);
      ({ mime, uri } = await client.upload(opts));
    } else {
      ({ mime, uri } = await upload(opts));
    }

    if (!rm_watermark) {
      const [, type] = mime.split('/');
      uri = watermark_uri({ uri, type });
    }

    if (md && mime.match('(image|video)/.*'))
      return `![](${uri}${title ? ` "${title}"` : ''})`;

    if (md) return `[${title}](${uri})`;

    return uri;
  }

  async runner_token() {
    return await get_driver(this).runner_token();
  }

  async register_runner(opts = {}) {
    return await get_driver(this).register_runner(opts);
  }

  async unregister_runner(opts = {}) {
    return await get_driver(this).unregister_runner(opts);
  }

  async runner_by_name(opts = {}) {
    return await get_driver(this).runner_by_name(opts);
  }

  async await_runner(opts = {}) {
    const { name, timer_max = 30, timer_step = 5 } = opts;

    let timer = 0;
    return new Promise((resolve, reject) => {
      const interval = setInterval(async () => {
        const runner = await this.runner_by_name({ name });

        if (runner) {
          clearInterval(interval);
          resolve(runner);
        }

        if (timer_max === timer) {
          clearInterval(interval);
          reject(new Error('Waiting for runner expiration timeout'));
        }

        timer += timer_step;
      }, timer_step * 1000);
    });
  }

  log_error(e) {
    console.error(e.message);
  }
}

module.exports = CML;
