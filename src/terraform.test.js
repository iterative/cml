const { iterativeCmlRunnerTpl } = require('./terraform');

describe('Terraform tests', () => {
  test('default options', async () => {
    const output = iterativeCmlRunnerTpl({});
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {}
          }
        }
      }"
    `);
  });

  test('basic settings', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      awsSecurityGroup: 'mysg'
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"aws_security_group\\": \\"mysg\\",
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });

  test('basic settings with runner forever', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 0,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001'
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 0,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });

  test('basic settings with metadata', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      metadata: { one: 'value', two: null, 'no problem': 'with spaces' }
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"metadata\\": {
                \\"one\\": \\"value\\",
                \\"two\\": null,
                \\"no problem\\": \\"with spaces\\"
              },
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });

  test('basic settings with kubernetes node selector', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      kubernetesNodeSelector: {
        accelerator: 'infer',
        ram: null,
        'disk type': 'hard drives'
      }
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\",
              \\"kubernetes_node_selector\\": {
                \\"accelerator\\": \\"infer\\",
                \\"ram\\": null,
                \\"disk type\\": \\"hard drives\\"
              }
            }
          }
        }
      }"
    `);
  });

  test('basic settings with docker volumes', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      dockerVolumes: ['/aa:/aa', '/bb:/bb']
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"cloud\\": \\"aws\\",
              \\"docker_volumes\\": [
                \\"/aa:/aa\\",
                \\"/bb:/bb\\"
              ],
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });

  test('basic settings with permission set', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      permissionSet: 'arn:aws:iam::1:instance-profile/x',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      awsSecurityGroup: 'mysg'
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"aws_security_group\\": \\"mysg\\",
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"instance_permission_set\\": \\"arn:aws:iam::1:instance-profile/x\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });

  test('Startup script', async () => {
    const output = iterativeCmlRunnerTpl({
      repo: 'https://',
      token: 'abc',
      driver: 'gitlab',
      labels: 'mylabel',
      idleTimeout: 300,
      name: 'myrunner',
      single: true,
      cloud: 'aws',
      region: 'west',
      type: 'mymachinetype',
      gpu: 'mygputype',
      hddSize: 50,
      sshPrivate: 'myprivate',
      spot: true,
      spotPrice: '0.0001',
      startupScript: 'c3VkbyBlY2hvICdoZWxsbyB3b3JsZCcgPj4gL3Vzci9oZWxsby50eHQ='
    });
    expect(JSON.stringify(output, null, 2)).toMatchInlineSnapshot(`
      "{
        \\"terraform\\": {
          \\"required_providers\\": {
            \\"iterative\\": {
              \\"source\\": \\"iterative/iterative\\"
            }
          }
        },
        \\"provider\\": {
          \\"iterative\\": {}
        },
        \\"resource\\": {
          \\"iterative_cml_runner\\": {
            \\"runner\\": {
              \\"cloud\\": \\"aws\\",
              \\"driver\\": \\"gitlab\\",
              \\"instance_gpu\\": \\"mygputype\\",
              \\"instance_hdd_size\\": 50,
              \\"idle_timeout\\": 300,
              \\"labels\\": \\"mylabel\\",
              \\"name\\": \\"myrunner\\",
              \\"region\\": \\"west\\",
              \\"repo\\": \\"https://\\",
              \\"single\\": true,
              \\"spot\\": true,
              \\"spot_price\\": \\"0.0001\\",
              \\"ssh_private\\": \\"myprivate\\",
              \\"startup_script\\": \\"c3VkbyBlY2hvICdoZWxsbyB3b3JsZCcgPj4gL3Vzci9oZWxsby50eHQ=\\",
              \\"token\\": \\"abc\\",
              \\"instance_type\\": \\"mymachinetype\\"
            }
          }
        }
      }"
    `);
  });
});
