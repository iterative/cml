const { exec } = require('../../src/utils');

describe('CML e2e', () => {
  test('cml-ci --help', async () => {
    const output = await exec(
      `echo none | node ./bin/cml.js rerun-workflow --help`
    );

    expect(output).toMatchInlineSnapshot(`
      "cml.js rerun-workflow

      Reruns a workflow given the jobId or workflow Id

      Options:
        --help     Show help                                                 [boolean]
        --version  Show version number                                       [boolean]
        --log      Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
        --id       Specifies the run Id to be rerun.                          [string]
        --repo     Specifies the repo to be used. If not specified is extracted from
                   the CI ENV.                                                [string]
        --token    Personal access token to be used. If not specified in extracted
                   from ENV REPO_TOKEN.                                       [string]
        --driver   If not specify it infers it from the ENV.
                                   [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"]"
    `);
  });
});
