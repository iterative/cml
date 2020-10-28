const { execSync } = require('child_process');
const git_url_parse = require('git-url-parse');

const GitlabClient = require('./drivers/gitlab');
const GithubClient = require('./drivers/github');
const { upload, exec } = require('./utils');

const uri_no_trailing_slash = (uri) => {
  return uri.endsWith('/') ? uri.substr(0, uri.length - 1) : uri;
};

const repo_from_origin = () => {
  const origin = execSync('git config --get remote.origin.url').toString(
    'utf8'
  );
  return git_url_parse(origin).toString('https').replace('.git', '');
};

const infer_driver = (opts = {}) => {
  const { repo } = opts;
  if (repo && repo.includes('github.com')) return 'github';
  if (repo && repo.includes('gitlab.com')) return 'gitlab';

  const { GITHUB_REPOSITORY, CI_PROJECT_URL } = process.env;
  if (GITHUB_REPOSITORY) return 'github';
  if (CI_PROJECT_URL) return 'gitlab';
};

const env_token = () => {
  const { repo_token, GITHUB_TOKEN, GITLAB_TOKEN } = process.env;
  return repo_token || GITHUB_TOKEN || GITLAB_TOKEN;
};

const get_client = (opts) => {
  const { driver, repo, token } = opts;
  if (!driver) throw new Error('driver not set');

  if (driver === 'github') return new GithubClient({ repo, token });
  if (driver === 'gitlab') return new GitlabClient({ repo, token });

  throw new Error('driver unknown!');
};

class CML {
  constructor(opts = {}) {
    const { driver, repo, token } = opts;

    this.repo = uri_no_trailing_slash(repo || repo_from_origin());
    this.token = token || env_token();
    this.driver = driver || infer_driver({ repo: this.repo });
  }

  async head_sha() {
    return (await exec(`git rev-parse HEAD`)).replace(/(\r\n|\n|\r)/gm, '');
  }

  async comment_create(opts = {}) {
    const sha = await this.head_sha();
    opts.commit_sha = opts.commit_sha || sha;

    return await get_client(this).comment_create(opts);
  }

  async check_create(opts = {}) {
    const sha = await this.head_sha();
    opts.head_sha = opts.head_sha || sha;

    return await get_client(this).check_create(opts);
  }

  async publish(opts = {}) {
    const { title = '', md, gitlab_uploads, backend = 'cml' } = opts;

    let mime, uri;

    if (gitlab_uploads || backend !== 'cml') {
      const client = get_client({ ...this, driver: 'gitlab' });
      ({ mime, uri } = await client.upload(opts));
    } else {
      ({ mime, uri } = await upload(opts));
    }

    if (md && mime.match('(image|video)/.*'))
      return `![](${uri}${title ? ` "${title}"` : ''})`;

    if (md) return `[${title}](${uri})`;

    return uri;
  }

  async runner_token() {
    return await get_client(this).runner_token();
  }

  async register_runner(opts = {}) {
    return await get_client(this).register_runner(opts);
  }

  log_error(e) {
    console.error(e.message);
  }
}

module.exports = CML;
