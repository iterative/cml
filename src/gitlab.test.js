describe('check_ran_ref', () => {
  test('Two jobs with same commit id and job name coincides with current returns true', async () => {
    process.env.CI_PROJECT_PATH = 'john/project';
    process.env.CI_COMMIT_SHA = 'f85779e8f05199610b5bbdfd64782be51995c35a';
    process.env.CI_JOB_NAME = 'dvc';

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
      stage: 'dvc_action_run',
      name: 'dvc',
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
      stage: 'dvc_action_run',
      name: 'dvc',
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
      stage: 'dvc_action_run',
      name: 'dvc',
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
    },
    {
      id: 515844898,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:10:39.104Z',
      started_at: '2020-04-17T11:10:56.507Z',
      finished_at: '2020-04-17T11:11:11.281Z',
      duration: 14.774648,
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
        id: 'cbd1ac9818b5a656795266cd5777b5abb1481b31',
        short_id: 'cbd1ac98',
        created_at: '2020-04-17T13:10:34.000+02:00',
        parent_ids: ['3754bdbf9b029a134edb3d3feb2238db109ba6a7'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:10:34.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:10:34.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/cbd1ac9818b5a656795266cd5777b5abb1481b31'
      },
      pipeline: {
        id: 137151130,
        sha: 'cbd1ac9818b5a656795266cd5777b5abb1481b31',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T11:10:39.090Z',
        updated_at: '2020-04-17T11:11:11.411Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137151130'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515844898',
      artifacts: [
        {
          file_type: 'trace',
          size: 9025,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515844835,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:10:38.104Z',
      started_at: '2020-04-17T11:10:38.491Z',
      finished_at: '2020-04-17T11:10:56.218Z',
      duration: 17.727115,
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
        id: 'cbd1ac9818b5a656795266cd5777b5abb1481b31',
        short_id: 'cbd1ac98',
        created_at: '2020-04-17T13:10:34.000+02:00',
        parent_ids: ['3754bdbf9b029a134edb3d3feb2238db109ba6a7'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:10:34.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:10:34.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/cbd1ac9818b5a656795266cd5777b5abb1481b31'
      },
      pipeline: {
        id: 137151128,
        sha: 'cbd1ac9818b5a656795266cd5777b5abb1481b31',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T11:10:38.092Z',
        updated_at: '2020-04-17T11:10:56.319Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137151128'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515844835',
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
    },
    {
      id: 515841065,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:07:56.825Z',
      started_at: '2020-04-17T11:08:16.573Z',
      finished_at: '2020-04-17T11:08:30.563Z',
      duration: 13.989557,
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
        id: '3754bdbf9b029a134edb3d3feb2238db109ba6a7',
        short_id: '3754bdbf',
        created_at: '2020-04-17T13:07:50.000+02:00',
        parent_ids: ['37507f1c87a761581f96d49f7e67e8c22343e96e'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:07:50.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:07:50.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/3754bdbf9b029a134edb3d3feb2238db109ba6a7'
      },
      pipeline: {
        id: 137150305,
        sha: '3754bdbf9b029a134edb3d3feb2238db109ba6a7',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T11:07:56.813Z',
        updated_at: '2020-04-17T11:08:30.694Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137150305'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515841065',
      artifacts: [
        {
          file_type: 'trace',
          size: 9007,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515840947,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T11:07:55.000Z',
      started_at: '2020-04-17T11:07:55.366Z',
      finished_at: '2020-04-17T11:08:16.318Z',
      duration: 20.952169,
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
        id: '3754bdbf9b029a134edb3d3feb2238db109ba6a7',
        short_id: '3754bdbf',
        created_at: '2020-04-17T13:07:50.000+02:00',
        parent_ids: ['37507f1c87a761581f96d49f7e67e8c22343e96e'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T13:07:50.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T13:07:50.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/3754bdbf9b029a134edb3d3feb2238db109ba6a7'
      },
      pipeline: {
        id: 137150294,
        sha: '3754bdbf9b029a134edb3d3feb2238db109ba6a7',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T11:07:54.990Z',
        updated_at: '2020-04-17T11:08:16.427Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137150294'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515840947',
      artifacts: [
        {
          file_type: 'trace',
          size: 9070,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515822491,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:55:05.195Z',
      started_at: '2020-04-17T10:55:20.950Z',
      finished_at: '2020-04-17T10:55:35.281Z',
      duration: 14.331516,
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
        id: '37507f1c87a761581f96d49f7e67e8c22343e96e',
        short_id: '37507f1c',
        created_at: '2020-04-17T12:54:57.000+02:00',
        parent_ids: ['453c48bbf872563c12a906ded24020077f1f6945'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:54:57.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:54:57.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/37507f1c87a761581f96d49f7e67e8c22343e96e'
      },
      pipeline: {
        id: 137145712,
        sha: '37507f1c87a761581f96d49f7e67e8c22343e96e',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T10:55:05.181Z',
        updated_at: '2020-04-17T10:55:35.416Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137145712'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515822491',
      artifacts: [
        {
          file_type: 'trace',
          size: 9134,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515822476,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:55:04.384Z',
      started_at: '2020-04-17T10:55:04.805Z',
      finished_at: '2020-04-17T10:55:20.699Z',
      duration: 15.893149,
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
        id: '37507f1c87a761581f96d49f7e67e8c22343e96e',
        short_id: '37507f1c',
        created_at: '2020-04-17T12:54:57.000+02:00',
        parent_ids: ['453c48bbf872563c12a906ded24020077f1f6945'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:54:57.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:54:57.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/37507f1c87a761581f96d49f7e67e8c22343e96e'
      },
      pipeline: {
        id: 137145700,
        sha: '37507f1c87a761581f96d49f7e67e8c22343e96e',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T10:55:04.373Z',
        updated_at: '2020-04-17T10:55:20.832Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137145700'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515822476',
      artifacts: [
        {
          file_type: 'trace',
          size: 9210,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515752428,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:09:16.168Z',
      started_at: '2020-04-17T10:09:34.028Z',
      finished_at: '2020-04-17T10:09:46.092Z',
      duration: 12.063917,
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
        id: '453c48bbf872563c12a906ded24020077f1f6945',
        short_id: '453c48bb',
        created_at: '2020-04-17T12:09:11.000+02:00',
        parent_ids: ['49083299a4b1f0c566cc11684a8b6b5133b52fd1'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:09:11.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:09:11.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/453c48bbf872563c12a906ded24020077f1f6945'
      },
      pipeline: {
        id: 137130875,
        sha: '453c48bbf872563c12a906ded24020077f1f6945',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T10:09:16.157Z',
        updated_at: '2020-04-17T10:09:46.226Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137130875'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515752428',
      artifacts: [
        {
          file_type: 'trace',
          size: 9183,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515752416,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:09:15.722Z',
      started_at: '2020-04-17T10:09:16.210Z',
      finished_at: '2020-04-17T10:09:33.775Z',
      duration: 17.564583,
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
        id: '453c48bbf872563c12a906ded24020077f1f6945',
        short_id: '453c48bb',
        created_at: '2020-04-17T12:09:11.000+02:00',
        parent_ids: ['49083299a4b1f0c566cc11684a8b6b5133b52fd1'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:09:11.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:09:11.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/453c48bbf872563c12a906ded24020077f1f6945'
      },
      pipeline: {
        id: 137130871,
        sha: '453c48bbf872563c12a906ded24020077f1f6945',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T10:09:15.712Z',
        updated_at: '2020-04-17T10:09:34.154Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137130871'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515752416',
      artifacts: [
        {
          file_type: 'trace',
          size: 9241,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515750045,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:07:22.511Z',
      started_at: '2020-04-17T10:07:35.218Z',
      finished_at: '2020-04-17T10:07:47.656Z',
      duration: 12.437577,
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
        id: '49083299a4b1f0c566cc11684a8b6b5133b52fd1',
        short_id: '49083299',
        created_at: '2020-04-17T12:07:15.000+02:00',
        parent_ids: ['9bf156aa69140ac77b5dcfdc85129b01bc8afa4f'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:07:15.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:07:15.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/49083299a4b1f0c566cc11684a8b6b5133b52fd1'
      },
      pipeline: {
        id: 137130281,
        sha: '49083299a4b1f0c566cc11684a8b6b5133b52fd1',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T10:07:22.413Z',
        updated_at: '2020-04-17T10:07:47.804Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137130281'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515750045',
      artifacts: [
        {
          file_type: 'trace',
          size: 9183,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515750021,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T10:07:21.900Z',
      started_at: '2020-04-17T10:07:22.674Z',
      finished_at: '2020-04-17T10:07:34.978Z',
      duration: 12.304096,
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
        id: '49083299a4b1f0c566cc11684a8b6b5133b52fd1',
        short_id: '49083299',
        created_at: '2020-04-17T12:07:15.000+02:00',
        parent_ids: ['9bf156aa69140ac77b5dcfdc85129b01bc8afa4f'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T12:07:15.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T12:07:15.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/49083299a4b1f0c566cc11684a8b6b5133b52fd1'
      },
      pipeline: {
        id: 137130276,
        sha: '49083299a4b1f0c566cc11684a8b6b5133b52fd1',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T10:07:21.860Z',
        updated_at: '2020-04-17T10:07:35.080Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137130276'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515750021',
      artifacts: [
        {
          file_type: 'trace',
          size: 9223,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515672011,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:19:00.154Z',
      started_at: '2020-04-17T09:19:22.225Z',
      finished_at: '2020-04-17T09:19:34.578Z',
      duration: 12.352581,
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
        id: '9bf156aa69140ac77b5dcfdc85129b01bc8afa4f',
        short_id: '9bf156aa',
        created_at: '2020-04-17T11:18:56.000+02:00',
        parent_ids: ['80675d2f0e2428a148c7343a45f22954e05b371e'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:18:56.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:18:56.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/9bf156aa69140ac77b5dcfdc85129b01bc8afa4f'
      },
      pipeline: {
        id: 137112930,
        sha: '9bf156aa69140ac77b5dcfdc85129b01bc8afa4f',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T09:19:00.139Z',
        updated_at: '2020-04-17T09:19:34.722Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137112930'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515672011',
      artifacts: [
        {
          file_type: 'trace',
          size: 9103,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515671991,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:18:59.747Z',
      started_at: '2020-04-17T09:19:00.127Z',
      finished_at: '2020-04-17T09:19:21.961Z',
      duration: 21.833614,
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
        id: '9bf156aa69140ac77b5dcfdc85129b01bc8afa4f',
        short_id: '9bf156aa',
        created_at: '2020-04-17T11:18:56.000+02:00',
        parent_ids: ['80675d2f0e2428a148c7343a45f22954e05b371e'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:18:56.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:18:56.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/9bf156aa69140ac77b5dcfdc85129b01bc8afa4f'
      },
      pipeline: {
        id: 137112927,
        sha: '9bf156aa69140ac77b5dcfdc85129b01bc8afa4f',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T09:18:59.729Z',
        updated_at: '2020-04-17T09:19:22.056Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137112927'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515671991',
      artifacts: [
        {
          file_type: 'trace',
          size: 9232,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515667283,
      status: 'success',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:15:47.902Z',
      started_at: '2020-04-17T09:16:14.370Z',
      finished_at: '2020-04-17T09:16:39.626Z',
      duration: 25.255978,
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
        id: '80675d2f0e2428a148c7343a45f22954e05b371e',
        short_id: '80675d2f',
        created_at: '2020-04-17T11:15:42.000+02:00',
        parent_ids: ['58fde280045c67a870445b0bf52baa1412005ae8'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:15:42.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:15:42.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/80675d2f0e2428a148c7343a45f22954e05b371e'
      },
      pipeline: {
        id: 137111945,
        sha: '80675d2f0e2428a148c7343a45f22954e05b371e',
        ref: 'branch2',
        status: 'success',
        created_at: '2020-04-17T09:15:47.855Z',
        updated_at: '2020-04-17T09:16:39.705Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137111945'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515667283',
      artifacts: [
        {
          file_type: 'trace',
          size: 9343,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515667282,
      status: 'success',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:15:47.881Z',
      started_at: '2020-04-17T09:15:48.215Z',
      finished_at: '2020-04-17T09:16:14.098Z',
      duration: 25.882255,
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
        id: '80675d2f0e2428a148c7343a45f22954e05b371e',
        short_id: '80675d2f',
        created_at: '2020-04-17T11:15:42.000+02:00',
        parent_ids: ['58fde280045c67a870445b0bf52baa1412005ae8'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:15:42.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:15:42.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/80675d2f0e2428a148c7343a45f22954e05b371e'
      },
      pipeline: {
        id: 137111946,
        sha: '80675d2f0e2428a148c7343a45f22954e05b371e',
        ref: 'refs/merge-requests/2/head',
        status: 'success',
        created_at: '2020-04-17T09:15:47.870Z',
        updated_at: '2020-04-17T09:16:14.194Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137111946'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515667282',
      artifacts: [
        {
          file_type: 'trace',
          size: 9340,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515664203,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:13:39.359Z',
      started_at: '2020-04-17T09:13:58.585Z',
      finished_at: '2020-04-17T09:14:12.612Z',
      duration: 14.026657,
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
        id: '58fde280045c67a870445b0bf52baa1412005ae8',
        short_id: '58fde280',
        created_at: '2020-04-17T11:13:34.000+02:00',
        parent_ids: ['251a42237f0a06cb855669e557b142274ddde630'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:13:34.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:13:34.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/58fde280045c67a870445b0bf52baa1412005ae8'
      },
      pipeline: {
        id: 137111158,
        sha: '58fde280045c67a870445b0bf52baa1412005ae8',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T09:13:39.308Z',
        updated_at: '2020-04-17T09:14:12.743Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137111158'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515664203',
      artifacts: [
        {
          file_type: 'trace',
          size: 9103,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515664186,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'branch2',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:13:38.720Z',
      started_at: '2020-04-17T09:13:40.892Z',
      finished_at: '2020-04-17T09:13:58.327Z',
      duration: 17.435834,
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
        id: '58fde280045c67a870445b0bf52baa1412005ae8',
        short_id: '58fde280',
        created_at: '2020-04-17T11:13:34.000+02:00',
        parent_ids: ['251a42237f0a06cb855669e557b142274ddde630'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:13:34.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:13:34.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/58fde280045c67a870445b0bf52baa1412005ae8'
      },
      pipeline: {
        id: 137111153,
        sha: '58fde280045c67a870445b0bf52baa1412005ae8',
        ref: 'branch2',
        status: 'failed',
        created_at: '2020-04-17T09:13:38.651Z',
        updated_at: '2020-04-17T09:13:58.417Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137111153'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515664186',
      artifacts: [
        {
          file_type: 'trace',
          size: 9148,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    },
    {
      id: 515655293,
      status: 'failed',
      stage: 'dvc_action_run',
      name: 'dvc',
      ref: 'refs/merge-requests/2/head',
      tag: false,
      coverage: null,
      allow_failure: false,
      created_at: '2020-04-17T09:07:14.601Z',
      started_at: '2020-04-17T09:07:29.706Z',
      finished_at: '2020-04-17T09:07:43.720Z',
      duration: 14.014335,
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
        id: '251a42237f0a06cb855669e557b142274ddde630',
        short_id: '251a4223',
        created_at: '2020-04-17T11:07:08.000+02:00',
        parent_ids: ['fd35eb206ef3ba7281d082c2cf955eac42f51e93'],
        title: 'ci',
        message: 'ci\n',
        author_name: 'davidgortega',
        author_email: 'g.ortega.david@gmail.com',
        authored_date: '2020-04-17T11:07:08.000+02:00',
        committer_name: 'davidgortega',
        committer_email: 'g.ortega.david@gmail.com',
        committed_date: '2020-04-17T11:07:08.000+02:00',
        web_url:
          'https://gitlab.com/DavidGOrtega/dvc-mnist/-/commit/251a42237f0a06cb855669e557b142274ddde630'
      },
      pipeline: {
        id: 137109032,
        sha: '251a42237f0a06cb855669e557b142274ddde630',
        ref: 'refs/merge-requests/2/head',
        status: 'failed',
        created_at: '2020-04-17T09:07:14.589Z',
        updated_at: '2020-04-17T09:07:43.860Z',
        web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/pipelines/137109032'
      },
      web_url: 'https://gitlab.com/DavidGOrtega/dvc-mnist/-/jobs/515655293',
      artifacts: [
        {
          file_type: 'trace',
          size: 9116,
          filename: 'job.log',
          file_format: null
        }
      ],
      runner: null,
      artifacts_expire_at: null
    }
  ]
};
