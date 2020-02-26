const core = require('@actions/core')
const github = require('@actions/github')

const github_token = core.getInput('github_token');
const octokit = new github.GitHub(github_token);

try {
  // `who-to-greet` input defined in action metadata file
  const cloud = core.getInput('cloud');
  console.log(`Cloud ${cloud}!`);

  const time = (new Date()).toTimeString();
  core.setOutput("pull_time", time);
  core.setOutput("reproduce_time", time);
  core.setOutput("data_diff_time", time);
  core.setOutput("metrics_diff_time", time);

} catch (error) {
  core.setFailed(error.message);
}

