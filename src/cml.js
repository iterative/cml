const GitlabClient = require('./GitlabClient');
const GithubClient = require('./GithubClient');
const { upload } = require('./utils');

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

  async comment_create(opts = {}) {
    const client = get_client(this);
    return await client.comment_create(opts);
  }

  async check_create(opts = {}) {
    const client = get_client(this);
    return await client.check_create(opts);
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
    const client = get_client(this);
    return await client.runner_token();
  }

  log_error(e) {
    console.error(e.message);
  }
}

module.exports = CML;
