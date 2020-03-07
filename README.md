# DVC Github action for continuous delivery for machine learning

1. [Introduction](#introduction)
2. [Usage](#usage)
3. [Working with DVC remotes](#working-with-dvc-remotes)
4. [Examples](#examples)

## Introduction

DVC is a great tool as a data versioning system, but also is great as a build
tool for ML experimentation. This action offers the possibility of using DVC to
establish your ML pipeline to be run by Github Actions CI/CD were you could use
your own runners with special capabilities like GPUs.

The action performs in your push or pull requests:

1.  DVC [repro](https://dvc.org/doc/command-reference/repro)
2.  Push changes into DVC remote and Git remote
3.  Generates a DVC Report as a Github check displaying all the experiment
    metrics

![image](https://user-images.githubusercontent.com/414967/75673142-854ad800-5c82-11ea-97f4-256beca83754.png)
![image](https://user-images.githubusercontent.com/414967/75673087-677d7300-5c82-11ea-8ccb-be6a4f81eb5d.png)

## Usage

This action depends on:

- actions/checkout V2
- actions/setup-python

Simple example of your workflow with DVC action:

```yaml
name: your-workflow-name

on: [push, pull_request]

jobs:
  run:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v2

      - name: setup python
        uses: actions/setup-python@v1
        with:
          python-version: 3.6

      - uses: iterative/dvc-action
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          repro_targets: your-file.dvc
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## Input variables

| Variable             | Type   | Required | Default       | Info                                                                                    |
| -------------------- | ------ | -------- | ------------- | --------------------------------------------------------------------------------------- |
| github_token         | string | yes      |               | Is the github_token, this is setted automatically by Github as a secret.                |
| repro_targets        | string | no       | Dvcfile       | Comma delimited array of DVC files. If None is given will skip the process.             |
| metrics_diff_targets | string | no       |               | Comma delimited array of metrics files. If not specified will use all the metric files  |
| rev                  | string | no       | origin/master | Revision to be compared with current experiment. I.E. HEAD~1. Defaults to origin/master |

### Support for [ci skip] comment

If your commit comment includes the tag the DVC action will skip returning a 0
status code (success). Github is only accepting 0 or 1 as status codes. Any
value like 78 for neutral is invalid.

### env variables

DVC remote is set using env variables see
[Working with DVC remotes](#working-with-dvc-remotes).

## Working with DVC remotes

DVC support different kinds of remote
[storage](https://dvc.org/doc/command-reference/remote/add). To setup them
properly you have to setup credentials (if needed) as enviroment variables. We
choose env variables and not inputs to be compatible with other github actions
that set credentials like
https://github.com/aws-actions/configure-aws-credentials.  
We recommend you to set those variables as
[secrets](https://help.github.com/es/actions/automating-your-workflow-with-github-actions/creating-and-using-encrypted-secrets)
to keep them secure.

#### S3 and S3 compatible storage (Minio, DigitalOcean Spaces, IBM Cloud Object Storage...)

```yaml
- uses: iterative/dvc-action
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    dvc_repro_file: your-file.dvc

  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
    AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }}
```

:point_right: AWS_SESSION_TOKEN is optional.

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

:warning: Normally, GOOGLE_APPLICATION_CREDENTIALS points to the path of the
json file that contains the credentials. However in the action this variable
CONTAINS the content of the file. Copy that json and add it as a secret.

```yaml
env:
  GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
```

#### Google Drive

:warning: After configuring your
[Google Drive credentials](https://dvc.org/doc/command-reference/remote/add) you
will find a json file at
`your_project_path/.dvc/tmp/gdrive-user-credentials.json`. Copy that json and
add it as a secret.

```yaml
env:
  GDRIVE_USER_CREDENTIALS: ${{ secrets.GDRIVE_USER_CREDENTIALS }}
```

#### SSH

```yaml
env:
  DVC_REMOTE_SSH_KEY: ${{ secrets.DVC_REMOTE_SSH_KEY }}
```

## Examples

- [Tensorflow Mnist](https://github.com/DavidGOrtega/dvc-action/wiki/Tensorflow-Mnist)
