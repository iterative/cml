const fs = require('fs').promises;
const tempy = require('tempy');
const { exec, isProcRunning, sleep } = require('../../../src/utils');
const { tbLink } = require('./connect');

const CREDENTIALS =
  '{"refresh_token": "1//03vy0UEEbtGrlCgYIARAAGAMSNwF-L9Irj4R63gOnR8ySz0CqG65smNVt7WWqV-fDGHqtzJr_3Vp71fbPnYgkpeGoDnIAVeP28c8", "token_uri": "https://oauth2.googleapis.com/token", "client_id": "373649185512-26ojik4u7dt0rdtfdmfnhpajqqh579qd.apps.googleusercontent.com", "client_secret": "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", "scopes": ["openid", "https://www.googleapis.com/auth/userinfo.email"], "type": "authorized_user"}';

const isTbRunning = async () => {
  await sleep(2);
  const isRunning = await isProcRunning({ name: 'tensorboard' });

  return isRunning;
};

const rmTbDevExperiment = async (tbOutput) => {
  const id = /experiment\/([a-zA-Z0-9]{22})/.exec(tbOutput)[1];
  await exec('tensorboard', 'dev', 'delete', '--experiment_id', id);
};

describe('tbLink', () => {
  test.skip('timeout without result throws exception', async () => {
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

    expect(error.message).toBe(`Tensorboard took too long`);
  });

  test.skip('valid url is returned', async () => {
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
  test.skip('cml tensorboard-dev --md returns md and after command TB is still up', async () => {
    const name = 'My experiment';
    const desc = 'Test experiment';
    const title = 'go to the experiment';
    const output = await exec(
      'node',
      './bin/cml.js',
      'tensorboard-dev',
      '--credentials',
      CREDENTIALS,
      '--md',
      '--title',
      title,
      '--logdir',
      'logs',
      '--name',
      name,
      '--description',
      desc
    );

    const isRunning = await isTbRunning();
    await rmTbDevExperiment(output);

    expect(isRunning).toBe(true);
    expect(output.startsWith(`[${title}](https://`)).toBe(true);
    expect(output.includes('cml=tb')).toBe(true);
  });

  test.skip('cml tensorboard-dev invalid creds', async () => {
    try {
      await exec(
        'node',
        './bin/cml.js',
        'tensorboard-dev',
        '--credentials',
        'invalid'
      );
    } catch (err) {
      expect(err.message.includes('json.decoder.JSONDecodeError')).toBe(true);
    }
  });
});
