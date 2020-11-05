jest.setTimeout(200000);

const { exec, is_proc_running, sleep } = require('../src/utils');
const CREDENTIALS =
  '{"refresh_token": "1//03FiVnGk2xhnNCgYIARAAGAMSNwF-L9IrPH8FOOVWEYUihFDToqxyLArxfnbKFmxEfhzys_KYVVzBisYlAy225w4HaX3ais5TV_Q", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "373649185512-8v619h5kft38l4456nm2dj4ubeqsrvh6.apps.googleusercontent.com", "client_secret": "pOyAuU2yq2arsM98Bw5hwYtr", "scopes": ["openid", "https://www.googleapis.com/auth/userinfo.email"], "type": "authorized_user"}';

const is_tb_running = async () => {
  await sleep(2);
  const is_running = await is_proc_running({ name: 'tensorboard' });

  return is_running;
};

const rm_tb_dev_experiment = async (tb_output) => {
  const id = /experiment\/([a-zA-Z0-9]{22})/.exec(tb_output)[1];
  await exec(`tensorboard dev delete --experiment_id ${id}`);
};

describe('CML e2e', () => {
  test('cml-tensorboard-dev.js -h', async () => {
    const output = await exec(`node ./bin/cml-tensorboard-dev.js -h`);

    expect(output).toMatchInlineSnapshot(`
      "Usage: cml-tensorboard-dev.js

      Options:
        --version          Show version number                               [boolean]
        --credentials, -c  TB credentials as json. Usually found at
                           ~/.config/tensorboard/credentials/uploader-creds.json. If
                           not specified will look for the json at the env variable
                           TB_CREDENTIALS.
        --logdir           Directory containing the logs to process.
        --name             Tensorboard experiment title. Max 100 characters.
        --description      Tensorboard experiment description. Markdown format. Max
                           600 characters.
        --md               Output as markdown [title || name](url).          [boolean]
        --title, -t        Markdown title, if not specified, param name will be used.
        --file, -f         Append the output to the given file. Create it if does not
                           exist.
        -h                 Show help                                         [boolean]
        --plugins"
    `);
  });

  test('cml-tensorboard-dev.js --md returns md and after command TB is still up', async () => {
    const name = 'My experiment';
    const desc = 'Test experiment';
    const title = 'go to the experiment';
    const output = await exec(
      `node ./bin/cml-tensorboard-dev.js --credentials '${CREDENTIALS}' \
        --md --title '${title}' \
        --logdir logs --name '${name}' --description '${desc}'`
    );

    const is_running = await is_tb_running();
    await rm_tb_dev_experiment(output);

    expect(is_running).toBe(true);
    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.includes('cml=tb')).toBe(true);
  });
});
