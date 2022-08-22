const fs = require('fs').promises;
const tempy = require('tempy');
const { exec, isProcRunning, sleep } = require('../../../src/utils');
const { tbLink } = require('./start');

const CREDENTIALS =
  '{"refresh_token": "1//03FiVnGk2xhnNCgYIARAAGAMSNwF-L9IrPH8FOOVWEYUihFDToqxyLArxfnbKFmxEfhzys_KYVVzBisYlAy225w4HaX3ais5TV_Q", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "373649185512-8v619h5kft38l4456nm2dj4ubeqsrvh6.apps.googleusercontent.com", "client_secret": "pOyAuU2yq2arsM98Bw5hwYtr", "scopes": ["openid", "https://www.googleapis.com/auth/userinfo.email"], "type": "authorized_user"}';

const isTbRunning = async () => {
  await sleep(2);
  const isRunning = await isProcRunning({ name: 'tensorboard' });

  return isRunning;
};

const rmTbDevExperiment = async (tbOutput) => {
  const id = /experiment\/([a-zA-Z0-9]{22})/.exec(tbOutput)[1];
  await exec(`tensorboard dev delete --experiment_id ${id}`);
};

describe('tbLink', () => {
  test('timeout without result throws exception', async () => {
    const stdout = tempy.file({ extension: 'log' });
    const stderror = tempy.file({ extension: 'log' });
    const message = 'there is an error';
    let error;

    await fs.writeFile(stdout, 'nothing');
    await fs.writeFile(stderror, message);

    try {
      await tbLink({ stdout, stderror, timeout: 5 });
    } catch (err) {
      error = err;
    }

    expect(error.message).toBe(`Tensorboard took too long. ${message}`);
  });

  test('valid url is returned', async () => {
    const stdout = tempy.file({ extension: 'log' });
    const stderror = tempy.file({ extension: 'log' });
    const message = 'https://iterative.ai';

    await fs.writeFile(stdout, message);
    await fs.writeFile(stderror, '');

    const link = await tbLink({ stderror, stdout, timeout: 5 });
    expect(link).toBe(`${message}/?cml=tb`);
  });
});

describe('CML e2e', () => {
  test('cml tensorboard-dev --help', async () => {
    const output = await exec(`node ./bin/cml.js tensorboard-dev --help`);

    expect(output).toMatchInlineSnapshot(`
      "cml.js tensorboard-dev

      Global Options:
            --log     Maximum log level
                [string] [choices: \\"error\\", \\"warn\\", \\"info\\", \\"debug\\"] [default: \\"info\\"]
            --driver  Git provider where the repository is hosted
          [string] [choices: \\"github\\", \\"gitlab\\", \\"bitbucket\\"] [default: infer from the
                                                                          environment]
            --repo    Repository URL or slug
                                        [string] [default: infer from the environment]
            --token   Personal access token
                                        [string] [default: infer from the environment]

      Options:
            --help          Show help                                        [boolean]
            --version       Show version number                              [boolean]
        -c, --credentials   TensorBoard credentials as JSON, usually found at
                            ~/.config/tensorboard/credentials/uploader-creds.json
                                                                   [string] [required]
            --logdir        Directory containing the logs to process          [string]
            --name          Tensorboard experiment title; max 100 characters  [string]
            --description   Tensorboard experiment description in Markdown format; max
                            600 characters                                    [string]
            --md            Output as markdown [title || name](url)          [boolean]
        -t, --title         Markdown title, if not specified, param name will be used
                                                                              [string]
            --rm-watermark  Avoid CML watermark                              [boolean]"
    `);
  });

  test('cml tensorboard-dev --md returns md and after command TB is still up', async () => {
    const name = 'My experiment';
    const desc = 'Test experiment';
    const title = 'go to the experiment';
    const output = await exec(
      `node ./bin/cml.js tensorboard-dev --credentials '${CREDENTIALS}' \
        --md --title '${title}' \
        --logdir logs --name '${name}' --description '${desc}'`
    );

    const isRunning = await isTbRunning();
    await rmTbDevExperiment(output);

    expect(isRunning).toBe(true);
    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.includes('cml=tb')).toBe(true);
  });

  test('cml tensorboard-dev invalid creds', async () => {
    try {
      await exec(`node ./bin/cml.js tensorboard-dev --credentials 'invalid'`);
    } catch (err) {
      expect(err.message.includes('json.decoder.JSONDecodeError')).toBe(true);
    }
  });
});
