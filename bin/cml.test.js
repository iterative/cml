const { exec } = require('../src/utils');

describe('command-line interface tests', () => {
  test('cml --help', async () => {
    const output = await exec(`node ./bin/cml.js --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js <command>

      Commands:
        cml.js ci                                 Fixes specific CI setups
        cml.js pr <glob path...>                  Create a pull request with the
                                                  specified files
        cml.js publish <asset>                    Upload an image to build a report
        cml.js rerun-workflow                     Reruns a workflow given the jobId or
                                                  workflow Id
        cml.js runner                             Launch and register a self-hosted
                                                  runner
        cml.js send-comment <markdown file>       Comment on a commit
        cml.js send-github-check <markdown file>  Create a check report
        cml.js tensorboard-dev                    Get a tensorboard link

      Options:
        --help     Show help                                                 [boolean]
        --version  Show version number                                       [boolean]
        --log      Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]"
    `);
  });
});
