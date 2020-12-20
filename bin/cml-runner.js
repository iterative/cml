#!/usr/bin/env node

const { resolve, join } = require('path');
const fs = require('fs').promises;
const fse = require('fs-extra');
const yargs = require('yargs');
const decamelize = require('decamelize-keys');

const {
  exec,
  randid,
  ssh_connection,
  ssh_public_from_private_rsa,
  parse_param_newline
} = require('../src/utils');
const tf = require('../src/terraform');
const CML = require('../src/cml');

const NAME = `cml-${randid()}`;
const {
  DOCKER_MACHINE, // DEPRECATED

  RUNNER_PATH = `${NAME}`,
  RUNNER_IDLE_TIMEOUT = 5 * 60,
  RUNNER_LABELS = 'cml',
  RUNNER_NAME = NAME,
  RUNNER_DRIVER,
  RUNNER_REPO,
  repo_token,

  CML_PATH = '.cml',

  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY
} = process.env;

let cml;
let RUNNER_LAUNCHED = false;
let RUNNER_TIMEOUT_TIMER = 0;
const RUNNER_JOBS_RUNNING = [];

const clear_cml = async (opts = {}) => {
  const { cml_path = CML_PATH } = opts;
  console.log('Clearing previous plan...');
  try {
    await fs.rmdir(cml_path, { recursive: true });
    await fs.mkdir(cml_path, { recursive: true });
  } catch (err) {}
};

const shutdown = async (opts) => {
  let { error, cloud } = opts;
  const { name, workspace = '' } = opts;

  console.log(error);
  if (error) console.error(error);

  const unregister_runner = async () => {
    try {
      console.log('Unregistering runner...');
      await cml.unregister_runner({ name });
      console.log('\tSuccess');
    } catch (err) {
      console.error('\tFailed');
      error = err;
    }
  };

  const shutdown_docker_machine = async () => {
    console.log('docker-machine destroy...');
    console.log(
      'Docker machine is deprecated and this will be removed!! Check how to deploy using our tf provider.'
    );
    try {
      await exec(`echo y | docker-machine rm ${DOCKER_MACHINE}`);
    } catch (err) {
      console.error(`\tFailed shutting down docker machine: ${err.message}`);
      error = err;
    }
  };

  const shutdown_tf = async () => {
    const { tf_resource } = opts;
    console.log( JSON.parse(tf_resource) );

    if (!tf_resource) {
      console.log(`\tNo TF resosurce found`);
      return;
    }
    
    try {
      const tf_path = join(CML_PATH, 'main.tf');
      const tpl = tf.iterative_provider_tpl();
      await fs.writeFile(tf_path, tpl);
      console.log(await tf.init({ dir: CML_PATH }));
      console.log(await exec('ls'));
      console.log(await tf.apply({ dir: CML_PATH }));
      const path = join(CML_PATH, 'terraform.tfstate');
      const tfstate = await tf.load_tfstate({ path });
      tfstate.resources = [ JSON.parse(tf_resource) ];
      console.log(tfstate);
      await save_tfstate({ tfstate, path });
      await tf.destroy({ dir: CML_PATH });
    } catch (err) {
      console.error(`\tFailed Terraform destroy: ${err.message}`);
      error = err;
    }
  };

  const destroy_terraform = async () => {
    try {
      console.log(await tf.destroy({ dir: CML_PATH }));
    } catch (err) {
      console.error(`\tFailed destroying terraform: ${err.message}`);
      error = err;
    }
  };

  if (cloud) {
    await destroy_terraform();
  } else {
    RUNNER_LAUNCHED && (await unregister_runner());
    DOCKER_MACHINE && (await shutdown_docker_machine());
    await shutdown_tf();
  }

  process.exit(error ? 1 : 0);
};

const run_cloud = async (opts) => {
  const run_terraform = async (opts) => {
    await tf.check_min_version();

    console.log('Terraform apply...');

    const {
      cloud,
      cloud_region: region,
      cloud_name: name,
      cloud_type: type,
      cloud_gpu: gpu,
      cloud_hdd_size: hdd_size,
      cloud_ssh_private: ssh_private,
      cloud_ssh_username: ssh_username,
      cloud_image: image,
      tf_file
    } = opts;

    const tf_path = join(CML_PATH, 'main.tf');

    let tpl;
    if (tf_file) {
      tpl = await fs.writeFile(tf_path, await fs.readFile(tf_file));
    } else {
      const ssh_public = ssh_private
        ? ssh_public_from_private_rsa(ssh_private)
        : null;

      tpl = tf.iterative_machine_tpl({
        cloud,
        region,
        name,
        type,
        gpu,
        hdd_size,
        ssh_public,
        ssh_username,
        image,
      });
    }

    console.log(tpl);

    await fs.writeFile(tf_path, tpl);
    await tf.init({ dir: CML_PATH });
    await tf.apply({ dir: CML_PATH });

    const tfstate_path = join(CML_PATH, 'terraform.tfstate');
    const tfstate = await tf.load_tfstate({ path: tfstate_path });

    return tfstate;
  };

  const setup_runner = async (opts) => {
    const { token, repo, driver } = cml;
    const {
      labels,
      idle_timeout,
      cloud_ssh_username: username,
      cloud_ssh_private: ssh_private,
      attached,

      resource,
      // runner_path = RUNNER_PATH
    } = opts;

    const {
      attributes: {
        instance_name,
        instance_ip: host,
        key_private = ssh_private
      }
    } = resource.instances[0];

    console.log('Provisioning resource...');
    console.log(JSON.stringify(resource));

    const ssh = await ssh_connection({
      host,
      username,
      private_key: key_private
    });

    console.log('Deploying runner...');
    const start_runner_cmd = `
export AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY} && \
export AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID} && \
DEBIAN_FRONTEND=noninteractive & \
echo "APT::Get::Assume-Yes \"true\";" | sudo tee -a /etc/apt/apt.conf.d/90assumeyes && \
sudo apt update && sudo apt install -y git && \
sudo npm install -g git+https://github.com/iterative/cml.git#cml-runner`;

console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
console.log({ repo, token });
    const launch_runner_cmd = `
(echo 'launching runner' && \
cml-runner \
--tf_resource='${JSON.stringify(resource)}' \
--name ${instance_name} \
--workspace ~/runner \
--labels ${labels} \
--idle-timeout ${idle_timeout} \
--driver ${driver} \
--repo ${repo} \
--token ${token}  && \
sleep 10)
`;

    //console.log(start_runner_cmd);
    console.log(launch_runner_cmd);

    const install_run_out = await ssh.execCommand(
      start_runner_cmd
    );

    const xx = await ssh.execCommand(
      launch_runner_cmd
    );

    console.log('*************************');
    console.log('*************************');
    console.log('*************************');
    console.log(install_run_out);
    console.log('*************************');
    console.log('*************************');
    console.log('*************************');
    console.log(xx);

    const { code: run_code, stdout: run_stdout, stderr: run_stderr} = await ssh.execCommand(
      launch_runner_cmd
    );

    await ssh.dispose();

    //if (install_code)
      //throw new Error(`Error installing the runner: ${stdout || stderr}`);

    if (run_code)
      throw new Error(`Error running the runner: ${run_stdout || run_stderr}`);

    if (!attached) await cml.await_runner({ name: instance_name });

    console.log('\tSuccess');
  };

  console.log('Deploying cloud runner plan...');
  await clear_cml();

  const tfstate = await run_terraform(opts);
  const { resources } = tfstate;
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];

    if (resource.type.startsWith('iterative_')) {

      const { instances } = resource;

      for (let j = 0; j < instances.length; j++) {
        const instance = instances[j];

        await setup_runner({
          ...opts,
          resource: { ...resource, instances: [instance] }
        });
      }
    }
  }
};

const run_local = async (opts) => {
  console.log(`Launching ${cml.driver} runner`);

  opts.workspace = resolve(
    __dirname,
    opts.workspace ? opts.workspace : opts.name ? opts.name : RUNNER_NAME
  );
  const { workspace: path, name, labels, idle_timeout } = opts;

  const proc = await cml.start_runner({
    path,
    name,
    labels,
    idle_timeout
  });

  const data_handler = (data) => {
    const log = cml.parse_runner_log({ data });
    log && console.log(JSON.stringify(log));

    if (log && log.status === 'job_started') {
      RUNNER_JOBS_RUNNING.push(1);
      RUNNER_TIMEOUT_TIMER = 0;
    } else if (log && log.status === 'job_ended') {
      RUNNER_JOBS_RUNNING.pop();
    }
  };
  proc.stderr.on('data', data_handler);
  proc.stdout.on('data', data_handler);
  proc.on('error', () => {
    shutdown(opts);
  });

  if (parseInt(idle_timeout) !== 0) {
    const watcher = setInterval(() => {
      RUNNER_TIMEOUT_TIMER >= idle_timeout &&
        shutdown(opts) &&
        clearInterval(watcher);

      if (!RUNNER_JOBS_RUNNING.length) RUNNER_TIMEOUT_TIMER++;
    }, 1000);
  }

  RUNNER_LAUNCHED = true;
};

const run = async (opts) => {
  console.log(process.env);
  console.log(opts);

  process.on('SIGTERM', () => shutdown(opts));
  process.on('SIGINT', () => shutdown(opts));
  process.on('SIGQUIT', () => shutdown(opts));

  const { driver, repo, token, cloud } = opts;

  cml = new CML({ driver, repo, token });

  await cml.repo_token_check();

  if (cloud) await run_cloud(opts);
  else await run_local(opts);

  /*

  const tf_resource = '{"mode":"managed","type":"iterative_machine","name":"machine","provider":"provider","instances":[{"schema_version":0,"attributes":{"aws_security_group":null,"cloud":"aws","id":"i-0176418115c3accfd","image":"iterative-cml","instance_gpu":null,"instance_hdd_size":35,"instance_id":"i-0176418115c3accfd","instance_ip":"54.153.79.37","instance_launch_time":"2020-12-20T19:14:14Z","instance_name":"iterative-lXGi2j8DM","instance_type":"m","key_name":"iterative-lXGi2j8DM","key_private":"-----BEGIN RSA PRIVATE KEY-----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n-----END RSA PRIVATE KEY-----n","key_public":"ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDx2TphYkNvkEbYPmyv6LLWC1zw8lp9CxINzO496RIteCYw+Zqg5K1oJIlu8FgH+ygD4f67ROJVSgR0AysDFCJHeN4QbKVJ9UJgl7bamvwotrx5Q1/FwuNVF4kj03A2zMS5y79mTJu9B/tdSchR68xThOdqhaL1uPxzlmJycyVwtDYvNvdGshl5ER69d44VwYHwwRTKqb6gmr5heTBvFkZAwYPtLosGm+mE/UhtLiKuZlVAgJUPkI7no4a31L0Cx6uSjGweWQoQUdktvRfVix1nkIdcJ6pCs301ggj4PL7S2NZBlnUAkKV0epjlmnDB/HQbiDBdc5gstz+1G6CBHNDE6ocLJHTFcW7T3/ay0syLXfyFeyGptqTUfkic5NoDgUBvJUm3wf0RQv8jo+ZJ3LF0myx2PnU3Hbpde+rHJTtCTBjFmEzanLPWIFo/RsOhZdmpGYc1Ino2DG/lc1fAXagv9zWw7YixerCGrtAJPvod7DCzxyq9MtqzFIEsNI0hNCkXojePQo0FP5VdLqSm2f2LeJT4WNHeCLzKpvYmyT/HHEgyBxb7AEZaSHSYaAFjIlPGpCGzASnGG/9oa1JuIgy36EvYrgRk8WZiLp6ek+BY57Yb79SqZcDTamIKlNuJAYHyKGR0Ryhzh9jm0zV/JcANm3fMGgxN4NkzP4B5QEELDQ==n","region":"us-west-1"},"sensitive_attributes":[],"private":"bnVsbA=="}]}'
  await clear_cml();
  const tf_path = join(CML_PATH, 'main.tf');
  const tpl = tf.iterative_provider_tpl();
  await fs.writeFile(tf_path, tpl);
  console.log(await tf.init({ dir: CML_PATH }));
  console.log(await exec('ls'));
  console.log(await tf.apply({ dir: CML_PATH }));
  const path = join(CML_PATH, 'terraform.tfstate');
  const tfstate = await tf.load_tfstate({ path });
  tfstate.resources = [ JSON.parse(tf_resource) ];
  console.log(tfstate);
  await save_tfstate({ tfstate, path });
  */
};

const opts = decamelize(
  yargs
    .usage(`Usage: $0`)
    .default('workspace', RUNNER_PATH)
    .describe('workspace', 'Runner workspace location. Defaults to {name}')
    .default('labels', RUNNER_LABELS)
    .describe('labels', 'Comma delimited runner labels')
    .default('idle-timeout', RUNNER_IDLE_TIMEOUT)
    .describe(
      'idle-timeout',
      'Time in seconds for the runner to be waiting for jobs before shutting down. 0 waits forever.'
    )
    .default('name', RUNNER_NAME)
    .describe('name', 'Name displayed in the repo once registered')

    .default('driver', RUNNER_DRIVER)
    .describe('driver', 'If not specify it infers it from the ENV.')
    .choices('driver', ['github', 'gitlab'])
    .default('repo', RUNNER_REPO)
    .describe(
      'repo',
      'Specifies the repo to be used. If not specified is extracted from the CI ENV.'
    )
    .default('token', repo_token)
    .describe(
      'token',
      'Personal access token to be used. If not specified in extracted from ENV.'
    )

    .default('cloud')
    .describe('cloud', 'Cloud to deploy the runner')
    .choices('cloud', ['aws', 'azure'])
    .default('cloud-region', 'us-west')
    .describe(
      'cloud-region',
      'Region where the instance is deployed. Also accepts native cloud regions.'
    )
    //.choices('cloud-region', ['us-east', 'us-west', 'eu-west', 'eu-north'])
    .default('cloud-type')
    .describe(
      'cloud-type',
      'Instance type. Choices: [m, l, xl]. Also supports native types like i.e. t2.micro'
    )
    .default('cloud-gpu-type')
    .describe('cloud-gpu-type', 'GPU type.')
    .choices('cloud-gpu-type', ['nogpu', 'k80', 'tesla'])
    .coerce('cloud-gpu-type', (val) => (val === 'nogpu' ? null : val))
    .default('cloud-hdd-size')
    .describe('cloud-hdd-size', 'HDD size in GB.')
    .default('cloud-image', 'iterative-cml')
    .describe(
      'cloud-image',
      'Image used in the cloud instance. Defaults to our iterative-cml (Ubuntu 18.04)'
    )
    .default('cloud-ssh-username', 'ubuntu')
    .describe(
      'cloud-ssh-username',
      'Your ssh username. Change only if the specified image is not iterative-cml.'
    )
    .default('cloud-ssh-private', '')
    .describe(
      'cloud-ssh-private',
      'Your private RSA SHH key. If not provided will be generated by the Terraform-provider-Iterative.'
    )
    .coerce('cloud-ssh-private', parse_param_newline)
    .boolean('attached')
    .describe(
      'attached',
      'Runs the cloud runner deployment in the foreground. Useful for debugging.'
    )
    .default('tf_resource')
    .hide('tf_resource')

    .help('h').argv
);

run(opts).catch((error) => {
  shutdown({ ...opts, error });
});
