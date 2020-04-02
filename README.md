# DVC Github action for continuous delivery for machine learning

1. [Introduction](#introduction)
2. [Usage](#usage)
3. [Working with DVC remotes](#working-with-dvc-remotes)
4. [Examples](#examples)

## Introduction

DVC is a great tool as a data versioning system, but also is great as a build
tool for ML experimentation. This repo offers the possibility of using DVC to
establish your ML pipeline to be run by Github Actions runners or Gitlab
runners.

You can also deploy
[your own Github runners](https://help.github.com/en/actions/hosting-your-own-runners)
or [your own Gitlab runners](https://docs.gitlab.com/runner/) with special
capabilities like GPUs...

Major benefits of using DVC-CML in your ML projects includes:

- Reproducibility: DVC is always in charge of maintain your experiment tracking
  all the dependencies, so you don't have to. Additionally your experiment is
  always running under the same constrains so you don't have to worry about
  replicating the same environment again.
- Observability: DVC offers you metrics to be tracked. In DVC-action we make
  those metrics more human friendly and we also offer direct access to other
  experiments run through the DVC Report offered as checks in Github or Releases
  in Gitlab.
- Releases: DVC-action tags every experiment that runs with repro generating the
  report. Aside of that DVC-CML is just a step in your
  [Github Workflow](https://help.github.com/en/actions/getting-started-with-github-actions/core-concepts-for-github-actions#workflow)
  or [Gitlab Pipeline](https://docs.gitlab.com/ee/ci/quick_start/) that could
  generate your model releases or deployment according to your business
  requirements.
- Teaming: Give visibility to your experiments or releases to your teammates
  working together.

DVC-cml performs in your push or pull requests:

1.  DVC [repro](https://dvc.org/doc/command-reference/repro)
2.  Push changes into DVC remote and Git remote
3.  - In Github generates a Github check displaying the DVC Report
    - In Gitlab generates a Tag/Release displaying the DVC Report

![image](https://user-images.githubusercontent.com/414967/75673142-854ad800-5c82-11ea-97f4-256beca83754.png)
![image](https://user-images.githubusercontent.com/414967/75673087-677d7300-5c82-11ea-8ccb-be6a4f81eb5d.png)

## Usage

<details>
<summary>DVC-CML for Github</summary>

> :eyes: Knowledge of [Github Actions](https://help.github.com/en/actions) and
> [DVC pipeline](https://dvc.org/doc/get-started/pipeline) is very useful for a
> fully comprehension.

Example of a simple DVC-CML workflow:

> :eyes: Note the use of the container

```yaml
name: your-workflow-name

on: [push, pull_request]

jobs:
  run:
    runs-on: ubuntu-latest
    container: docker://dvcorg/dvc-cml:latest

    steps:
      - uses: actions/checkout@v2

      - name: dvc_cml_run
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        repro_targets: your_dvc_target.dvc
      run: |
        # install your project dependencies
        dvc_cml_run
```

</details>

<details>
<summary>DVC-CML for Gitlab</summary>

> :eyes: Knowledge of
> [Gitlab CI/CD Pipeline](https://docs.gitlab.com/ee/ci/quick_start/) and
> [DVC pipeline](https://dvc.org/doc/get-started/pipeline) is very useful for a
> fully comprehension.

Example of a simple DVC-CML workflow in Gitlab:

> :eyes: Some required environment variables like remote credentials and
> GITLAB_TOKEN are set as CI/CD environment variables in Gitlab's UI

> :warning: `tag_prefix` should be set in order to have DVC Reports, i.e. dvc\_
> . This will generate tags in your repo with the report as release notes
> ![image](https://user-images.githubusercontent.com/414967/77463321-b93e9680-6e05-11ea-99bc-bf44f7bdf8d9.png)

```yaml
stages:
  - dvc_cml_run

dvc:
  stage: dvc_cml_run
  image: dvcorg/dvc-cml:latest
  variables:
    repro_targets: 'eval.dvc'
  script:
    - pip install tensorflow wget
    - dvc_cml_run
```

</details>

This workflow will run every time that you push code or do a Pull/Merge Request.
When triggered DVC-CML will setup the runner and DVC will run the pipelines
specified by `repro_targets`. Two scenarios may happen:

1. DVC repro is up to date and there is nothing to do. This means that the
   commit that you have done in your code is not related to your DVC pipelines
   and there is nothing to do.
2. DVC pipeline has changed and DVC will run repro, updating the output that may
   generate (models, data...) in your DVC remote storage and then committing,
   tagging and pushing the changes in git remote.

Additionally, you may extend your CI/CD Pipeline/Workflow to generate your
releases or even deploy automatically your models.

### Support for [ci skip] comment in Github

Many CI/CD vendors supports a special comment [ci skip] in the commit avoid run
the CI. We support this, ff your commit comment includes the tag the DVC action
will skip the CI returning an exit code of 0. We know that ideally the code
should be 78 however, at the time of this writing, Github is only accepting 0 or
1 as status codes.

### Variables

> :warning: In Github Actions they are set via `env:` not `inputs:`

> :eyes: In Gitlab pipeline they are set via `variables:`

| Variable               | Type   | Required | Default       | Info                                                                                                                                                                                                                                   |
| ---------------------- | ------ | -------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `repo_token`           | string | yes      |               | In Github you can set the default autogenerated GITHUB_TOKEN. In Gitlab you have to generate it. See [Tensorflow Mnist in Gitlab](#tensorflow-mnist-in-gitlab) example for a complete walkthrough.                                     |
| `baseline`             | string | no       | origin/master | Revision to be compared with current experiment, i.e. origin/master, HEAD~1 or a commit sha.                                                                                                                                           |
| `repro_targets`        | string | no       | Dvcfile       | Comma delimited array of DVC files. If None is given will skip the process.                                                                                                                                                            |
| `metrics_diff_targets` | string | no       |               | Comma delimited array of metrics files. If not specified will use all the metric files.                                                                                                                                                |
| `tag_prefix`           | string | no       |               | If set a new tag will be created in the repo with the name `${tag_prefix}${short_sha}`. This will enable the "Latest 5 experiments in the branch" list in the report and will enable the DVC Report in Gitlab as a release description |
| `metrics_format`       | string | no       | 0[.][0000000] | Metrics format following [numeral.js](http://numeraljs.com/)                                                                                                                                                                           |

## Working with DVC remotes

DVC support different kinds of remote
[storage](https://dvc.org/doc/command-reference/remote/add). To setup them
properly you have to setup credentials (if needed) as Github
[secrets](https://help.github.com/es/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)
or Gitlab masked
[enviroment variables](https://docs.gitlab.com/ee/ci/variables/README.html) to
keep them secure.

#### S3 and S3 compatible storage (Minio, DigitalOcean Spaces, IBM Cloud Object Storage...)

```yaml
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }}
```

> :point_right: AWS_SESSION_TOKEN is optional.

#### Azure

```yaml
env:
  AZURE_STORAGE_CONNECTION_STRING:
    ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
  AZURE_STORAGE_CONTAINER_NAME: ${{ secrets.AZURE_STORAGE_CONTAINER_NAME }}
```

#### Aliyn

```yaml
env:
  OSS_BUCKET: ${{ secrets.OSS_BUCKET }}
  OSS_ACCESS_KEY_ID: ${{ secrets.OSS_ACCESS_KEY_ID }}
  OSS_ACCESS_KEY_SECRET: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
  OSS_ENDPOINT: ${{ secrets.OSS_ENDPOINT }}
```

#### Google Storage

> :warning: Normally, GOOGLE_APPLICATION_CREDENTIALS points to the path of the
> json file that contains the credentials. However in the action this variable
> CONTAINS the content of the file. Copy that json and add it as a secret.

```yaml
env:
  GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
```

#### Google Drive

> :warning: After configuring your
> [Google Drive credentials](https://dvc.org/doc/command-reference/remote/add)
> you will find a json file at
> `your_project_path/.dvc/tmp/gdrive-user-credentials.json`. Copy that json and
> add it as a secret.

```yaml
env:
  GDRIVE_CREDENTIALS_DATA: ${{ secrets.GDRIVE_CREDENTIALS_DATA }}
```

#### SSH

```yaml
env:
  DVC_REMOTE_SSH_KEY: ${{ secrets.DVC_REMOTE_SSH_KEY }}
```

## Examples

- [Tensorflow Mnist for Github Actions](https://github.com/iterative/dvc-cml/wiki/Tensorflow-Mnist-for-Github-Actions)
- [Tensorflow Mnist for Gitlab CI](https://github.com/iterative/dvc-cml/wiki/Tensorflow-Mnist-for-Gitlab-CI)
