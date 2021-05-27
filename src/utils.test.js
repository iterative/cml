const { exec, upload, sshPublicFromPrivateRsa } = require('./utils');

describe('exec tests', () => {
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

describe('upload tests', () => {
  test('image/png', async () => {
    const { mime } = await upload({ path: 'assets/logo.png' });
    expect(mime).toBe('image/png');
  });

  test('application/pdf', async () => {
    const { mime } = await upload({ path: 'assets/logo.pdf' });
    expect(mime).toBe('application/pdf');
  });

  test('image/svg+xml', async () => {
    const { mime } = await upload({ path: 'assets/test.svg' });
    expect(mime).toBe('image/svg+xml');
  });
});

describe('Other tests', () => {
  test('ssh key from private', async () => {
    const privateKey =
      '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEAsDBTtak6uvFGqNU1OlvvddUlmTfpnHvjk6HUuZp3tLzIlpuwBSbmsTCs\ny9TRnlzgFGPqHkwBOzQsouepqhKN0fJDr8GGyECps9u5cy9GZ4iPVJGJBPWhbJb04KLunKnC\nTukvBjDZySy125l9+8xlIGcrkwLqLfPOVh6isltD4P86ZQTSDwUQPsoUBvM9e3Y/FcIsaBOy\noEYjSvQjeWM/9k0ZbBy2p/Sx/bx0iuO+24/oz7WyCOFeWT+Q7v+9Enm9X3t+uPA1aYOJow5i\n60JFv67TWpyjFS8N2w/Va6Hi3tz1vdZy6vp6DrpYzxE7cca4RmoBNvFOooD05iEGHM66cwID\nAQABAoIBAQCnnkJ1SDuskFBl3PkXvVEybAaqHsxsaFzZHhPwQ+lwlE3NIu6x6BF/L0ylWqHW\nJIu2OlwIWMyvE3MHxJfgSmiL/QyyD853gzUv/HERCT/UzdF2ZkLR6hGZ6n+rmrahasuGIUfw\nftcjEhstgXie7hSjYCPPZ+18rD94JQsp3bPVP8MtLEgoKEyxP4fKvysChu331ngayvXUCoQe\nU2s9SevZc6UZg6T/zKnUwv/uoWA/s9+QO++kMJ8gbfVkOUS7pzdwnms99Ybz8RuhwQVP4yU9\nbeN/HAngpfGO8FV4TAHhLfY+/E/BN+tGUP6xWlhThUtCqVeU1jJiijeHOfOodNqhAoGBAPZw\nWnW+XA9Ufo9h4ouFg9vNi+OxDrYSeMXWUCdElNufUS0B1da8Gf96ByADJwcZ7vZacSLc+/qy\nMMvC4nuKKSqgRrGEGAql4Mt4S3Q47HTxvoR/wM25JNrzkE8JdnBWdOZn7WVKuDb9JYdF/6qC\ntHfpwv7q6ellhYQHJPB+HxCRAoGBALcGPsFidRwGPB/4eRjuJEfqxZbO9fkF12prLaZ2qyqs\nudlI9mR3f31sVo8BD85BqLO8UIln/1druxzh2hZhLFebHJf5ySoUqFdJGwqDvUatzzGvvHS/\nnxdJ0aZdskft1e69KN5WAS5eqSBX0FhNLSqnc5kGSm6RZLEYET0WoVzDAoGARLNhpH1i8Ksf\ndR1WqIqaDcapfto3Pa68mHp8cdX+oZMycBeY43ogzUXZgqUeVi52nZrs+0kbvfG7BLLZrJMB\nku6HhqlKgn1nw5FPh6Du2lMiR5HN0AwTKC7KRh5fNEYF5M2IMrq3zCyaL7Hl6kTxxpQWVjZq\n6zPwGrRbKegfBOECgYEAsi0hQPCR48NqGxGxCoUjyuOSkhtPOKvoJ5DJs0nJntTiZNb0D6CJ\n+9dReQxmj7w5+Sg2G16kJT4avaZdwvW8zliSAJ3Kqe3MaJUh/x17UWh50fwsclfuECTsNZL3\nsbCnWTDLrY96vOKosXTrvlr7wo+cKPgH1BY1OXadqaPzWTMCgYBGRzMRd5XtR9gLfA7tmqT/\nb/QlhQWBmk7V1ZAX0RHn2xMT0k3MLxRMF47SDhfWPmFD8bP8YKNwiwS6gIKW37OF36pes3H4\niTeRccwoShV9vxQcf7z/gveFruzzlmq1xa09/Y+KS7iCvUmeABEDVQOOamtkTPcqaXHOyzGT\n+dTVjw==\n-----END RSA PRIVATE KEY-----';
    const publicKey = sshPublicFromPrivateRsa(privateKey);
    const expected =
      'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQCwMFO1qTq68Uao1TU6W+911SWZN+mce+OTodS5mne0vMiWm7AFJuaxMKzL1NGeXOAUY+oeTAE7NCyi56mqEo3R8kOvwYbIQKmz27lzL0ZniI9UkYkE9aFslvTgou6cqcJO6S8GMNnJLLXbmX37zGUgZyuTAuot885WHqKyW0Pg/zplBNIPBRA+yhQG8z17dj8VwixoE7KgRiNK9CN5Yz/2TRlsHLan9LH9vHSK477bj+jPtbII4V5ZP5Du/70Seb1fe3648DVpg4mjDmLrQkW/rtNanKMVLw3bD9VroeLe3PW91nLq+noOuljPETtxxrhGagE28U6igPTmIQYczrpz ';
    expect(publicKey).toBe(expected);
  });
});
