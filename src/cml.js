const GitlabClient = require('./drivers/gitlab');
const GithubClient = require('./drivers/github');
const { upload, exec } = require('./utils');

const get_client = (opts) => {
  const { driver, repo, token } = opts;
  if (!driver) throw new Error('driver not set');

  if (driver === 'github') return new GithubClient({ repo, token });
  if (driver === 'gitlab') return new GitlabClient({ repo, token });

  throw new Error('driver unknown!');
};

class CML {
  constructor(opts = {}) {
    const env_driver = () => {
      const { repo } = opts;
      const { GITHUB_REPOSITORY, CI_PROJECT_URL } = process.env;

      if (repo && repo.startsWith('https://github.com')) return 'github';
      if (repo && repo.startsWith('https://gitlab.com')) return 'gitlab';

      if (GITHUB_REPOSITORY) return 'github';
      if (CI_PROJECT_URL) return 'gitlab';
    };

    const { driver = env_driver(), repo, token } = opts;
    this.driver = driver;
    this.repo = repo;
    this.token = token;
  }

  env_repo() {
    return get_client(this).env_repo();
  }

  env_token() {
    return get_client(this).env_token();
  }

  env_is_pr() {
    return get_client(this).env_is_pr();
  }

  env_head_sha() {
    return get_client(this).env_head_sha();
  }

  async head_sha() {
    return (await exec(`git rev-parse HEAD`)).replace(/(\r\n|\n|\r)/gm, '');
  }

  async comment_create(opts = {}) {
    const sha = await this.head_sha();
    opts.sha = opts.sha || sha;

    return await get_client(this).comment_create(opts);
  }

  async check_create(opts = {}) {
    const sha = await this.head_sha();
    opts.sha = opts.sha || sha;

    return await get_client(this).check_create(opts);
  }

  async publish(opts = {}) {
    const { title = '', md, gitlab_uploads } = opts;

    let mime, uri;

    if (gitlab_uploads) {
      const client = get_client({ ...this, driver: 'gitlab' });
      ({ mime, uri } = await client.publish(opts));
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
