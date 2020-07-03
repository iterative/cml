jest.setTimeout(200000);

const fs = require('fs');
const { exec } = require('../src/utils');
const credentials =
  '{"refresh_token": "1//03FiVnGk2xhnNCgYIARAAGAMSNwF-L9IrPH8FOOVWEYUihFDToqxyLArxfnbKFmxEfhzys_KYVVzBisYlAy225w4HaX3ais5TV_Q", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "373649185512-8v619h5kft38l4456nm2dj4ubeqsrvh6.apps.googleusercontent.com", "client_secret": "pOyAuU2yq2arsM98Bw5hwYtr", "scopes": ["openid", "https://www.googleapis.com/auth/userinfo.email"], "type": "authorized_user"}';

const rm_tb_dev_experiment = async tb_output => {
  const id = /experiment\/([a-zA-Z0-9]{22})/.exec(tb_output)[1];
  await exec(`tensorboard dev delete --experiment_id ${id}`);
};

describe('CML e2e', () => {
  test('cml-tensorboard-dev.js -h', async () => {
    const output = await exec(`node ./bin/cml-tensorboard-dev.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-tensorboard-dev.js <path> --file <string>

      Options:
        --version      Show version number                                   [boolean]
        -h             Show help                                             [boolean]
        --logdir                   [default: Directory containing the logs to process]
        --name                 [default: Title of the experiment. Max 100 characters.]
        --description
               [default: Experiment description. Markdown format. Max 600 characters.]
        --plugins"
    `);
  });

  test('cml-tensorboard-dev.js --md', async () => {
    const name = 'My experiment';
    const output = await exec(
      `node ./bin/cml-tensorboard-dev.js --md --credentials '${credentials}' --logdir logs --name '${name}' --description 'Test experiment'`
    );

    await rm_tb_dev_experiment(output);

    expect(output.startsWith(`[${name}](https://`)).toBe(true);
  });

  test('cml-tensorboard-dev.js', async () => {
    const name = 'My experiment';
    const output = await exec(
      `node ./bin/cml-tensorboard-dev.js --credentials '${credentials}' --logdir logs --name '${name}' --description 'Test experiment'`
    );

    await rm_tb_dev_experiment(output);

    expect(output.startsWith(`https://`)).toBe(true);
  });

  test('cml-tensorboard-dev.js title is used not name', async () => {
    const name = 'My experiment';
    const title = 'go to tensorboard';
    const output = await exec(
      `node ./bin/cml-tensorboard-dev.js --credentials '${credentials}' --logdir logs --name '${name}' --title '${title}' --description 'Test experiment' --md`
    );

    await rm_tb_dev_experiment(output);

    expect(output.startsWith(`[${title}](https://`)).toBe(true);
  });

  test('cml-tensorboard-dev.js to file', async () => {
    const name = 'My experiment';
    const file = `cml-tensorboard-dev-test.md`;
    await exec(
      `node ./bin/cml-tensorboard-dev.js --credentials '${credentials}' --logdir logs --name '${name}' --description 'Test experiment' --file ${file}`
    );

    await rm_tb_dev_experiment(fs.readFileSync(file));

    expect(fs.existsSync(file)).toBe(true);
    await fs.promises.unlink(file);
  });
});
