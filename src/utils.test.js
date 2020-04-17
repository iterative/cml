const { exec, getInputArray } = require('./utils');
const { INPUT_SKIP, REPRO_TARGETS } = require('./settings');

describe('Exec', () => {
  test('exec is await and outputs hello', async () => {
    const output = await exec('echo hello');
    expect(output).toMatch('hello');
  });

  test('Command rejects if failure', async () => {
    let error;
    try {
      await exec('this_command_fails');
    } catch (err) {
      error = err;
    }

    expect(error).not.toBeNull();
  });
});

describe('getInputArray', () => {
  test('INPUT_SKIP, comma and not existing env variable', async () => {
    process.env.DVC_TEST = INPUT_SKIP;
    expect(getInputArray('DVC_TEST')).toBe(INPUT_SKIP);

    process.env.DVC_TEST = 'one,two,three';
    expect(getInputArray('DVC_TEST')).toStrictEqual(['one', 'two', 'three']);

    expect(getInputArray('DVC_NOT_EXIST')).toStrictEqual([]);
    expect(getInputArray('DVC_NOT_EXIST', ['one'])).toStrictEqual(['one']);
  });

  test('sdsd', async () => {
    process.env.repro_targets = '-';
    process.env.dvc_pull = '-';

    expect(getInputArray('repro_targets', REPRO_TARGETS)).toBe(INPUT_SKIP);
    expect(getInputArray('dvc_pull')).toBe(INPUT_SKIP);

    process.env.repro_targets = 'train.dvc';
    process.env.dvc_pull = 'data,models';

    expect(getInputArray('repro_targets', REPRO_TARGETS)).toStrictEqual([
      'train.dvc'
    ]);
    expect(getInputArray('dvc_pull')).toStrictEqual(['data', 'models']);
  });
});
