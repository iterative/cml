describe('check_ran_ref', () => {
  test('Two jobs with same commit id and job name coincides with current returns true', async () => {
    process.env.CI_PROJECT_PATH = 'john/project';
    process.env.CI_COMMIT_SHA = 'f85779e8f05199610b5bbdfd64782be51995c35a';
    process.env.CI_JOB_NAME = 'cml';

    const gitlab = require('./gitlab');
    gitlab.project_jobs = jest.fn(gitlab.project_jobs);
    gitlab.project_jobs.mockResolvedValue(FIXTURES.jobs);

    const check_run = await gitlab.check_ran_ref();

    expect(check_run).toBe(true);
  });
});

const FIXTURES = {
  jobs: [
    {
      id: 515851815,
      status: 'success',
      stage: 'cml_run',
      name: 'cml',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:15:58.383Z',
      started_at: '2020-04-17T11:15:59.813Z',
      finished_at: '2020-04-17T11:18:46.383Z',
      duration: 166.570754,
      user: {
        id: 2795770,
        name: 'DavidGOrtega',
        username: 'DavidGOrtega',
        state: 'active',
        avatar_url:
          'https://secure.gravatar.com/avatar/889e2875b4baaf7ebc33349f715b097e?s=80\u0026d=identicon',
        web_url: 'https://gitlab.com/DavidGOrtega',
        created_at: '2018-09-06T08:34:50.023Z',
        bio: null,
        location: null,
        public_email: '',
        skype: '',
        linkedin: '',
        twitter: '',
        website_url: '',
        organization: null,
        job_title: ''
      },
      commit: {
        id: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        short_id: 'f85779e8',
        created_at: '2020-04-17T13:14:35.000+02:00',
        parent_ids: ['cbd1ac9818b5a656795266cd5777b5abb1481b31'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:14:35.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:14:35.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/f85779e8f05199610b5bbdfd64782be51995c35a'
      },
      pipeline: {
        id: 137152209,
        sha: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        ref: 'branch2',
        status: 'success',
        created_at: '2020-04-17T11:14:41.841Z',
        updated_at: '2020-04-17T11:18:46.456Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137152209'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515851815',
      artifacts: [
        {
          file_type: 'trace',
          size: 23842,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: {
        id: 44949,
        description: 'shared-runners-manager-4.gitlab.com',
        ip_address: '104.196.221.206',
        active: true,
        is_shared: true,
        name: 'gitlab-runner',
        online: true,
        status: 'online'
      },
      artifacts_expire_at: null
    },
    {
      id: 515849861,
      status: 'success',
      stage: 'cml_run',
      name: 'cml',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:14:42.358Z',
      started_at: '2020-04-17T11:14:43.216Z',
      finished_at: '2020-04-17T11:17:33.400Z',
      duration: 170.184329,
      user: {
        id: 2795770,
        name: 'DavidGOrtega',
        username: 'DavidGOrtega',
        state: 'active',
        avatar_url:
          'https://secure.gravatar.com/avatar/889e2875b4baaf7ebc33349f715b097e?s=80\u0026d=identicon',
        web_url: 'https://gitlab.com/DavidGOrtega',
        created_at: '2018-09-06T08:34:50.023Z',
        bio: null,
        location: null,
        public_email: '',
        skype: '',
        linkedin: '',
        twitter: '',
        website_url: '',
        organization: null,
        job_title: ''
      },
      commit: {
        id: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        short_id: 'f85779e8',
        created_at: '2020-04-17T13:14:35.000+02:00',
        parent_ids: ['cbd1ac9818b5a656795266cd5777b5abb1481b31'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:14:35.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:14:35.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/f85779e8f05199610b5bbdfd64782be51995c35a'
      },
      pipeline: {
        id: 137152212,
        sha: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        ref: 'refs/merge-requests/2/head',
        status: 'success',
        created_at: '2020-04-17T11:14:42.332Z',
        updated_at: '2020-04-17T11:17:33.500Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137152212'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515849861',
      artifacts: [
        {
          file_type: 'trace',
          size: 23865,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: {
        id: 44949,
        description: 'shared-runners-manager-4.gitlab.com',
        ip_address: '104.196.221.206',
        active: true,
        is_shared: true,
        name: 'gitlab-runner',
        online: true,
        status: 'online'
      },
      artifacts_expire_at: null
    },
    {
      id: 515849829,
      status: 'failed',
      stage: 'cml_run',
      name: 'cml',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:14:41.854Z',
      started_at: '2020-04-17T11:14:42.333Z',
      finished_at: '2020-04-17T11:14:59.723Z',
      duration: 17.389823,
      user: {
        id: 2795770,
        name: 'DavidGOrtega',
        username: 'DavidGOrtega',
        state: 'active',
        avatar_url:
          'https://secure.gravatar.com/avatar/889e2875b4baaf7ebc33349f715b097e?s=80\u0026d=identicon',
        web_url: 'https://gitlab.com/DavidGOrtega',
        created_at: '2018-09-06T08:34:50.023Z',
        bio: null,
        location: null,
        public_email: '',
        skype: '',
        linkedin: '',
        twitter: '',
        website_url: '',
        organization: null,
        job_title: ''
      },
      commit: {
        id: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        short_id: 'f85779e8',
        created_at: '2020-04-17T13:14:35.000+02:00',
        parent_ids: ['cbd1ac9818b5a656795266cd5777b5abb1481b31'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:14:35.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:14:35.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/f85779e8f05199610b5bbdfd64782be51995c35a'
      },
      pipeline: {
        id: 137152209,
        sha: 'f85779e8f05199610b5bbdfd64782be51995c35a',
        ref: 'branch2',
        status: 'success',
        created_at: '2020-04-17T11:14:41.841Z',
        updated_at: '2020-04-17T11:18:46.456Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137152209'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515849829',
      artifacts: [
        {
          file_type: 'trace',
          size: 9039,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    }
  ]
};
