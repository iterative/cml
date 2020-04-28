# Continuous Machine Learning

![logo](imgs/dark_logo.png)


## Introduction
Continuous Machine Learning (**CML**) is a tool for implementing continuous integration & delivery (CI/CD) in 
machine learning projects. Use it to automate parts of your development workflow, including
model training and evaluation, comparing ML experiments across your project history, and 
monitoring changing datasets. 

CML uses DVC and Git to provide: 

- **Reproducibility.** When you automate your workflow, it becomes reproducible. 
- **Observability.** CML creates human-readable reports to compare user-defined metrics like model performance across commits. Compare experiments like pull requests. 
- **Release-readiness.**: With CML, every experiment is a release candidate. 
- **Team efficacy.** Review your teammate's models and datasets like code. Checkin and checkout each other's workspaces. 

## Usage
CML extends the CI/CD workflow to ML projects. When a pull or push to your project repository is detected, CML coordinates cloud resources to reproduce a user-defined pipeline and return a CML Report to your repository. 

To begin, you'll need a GitHub or GitLab account. Users may wish to familiarize themselves with 
[Github Actions](https://help.github.com/en/actions) or [GitLab CI/CD](https://about.gitlab.com/stages-devops-lifecycle/continuous-integration/). Here, will discuss the GitHub use case. Please see our documentation for details about configuring CML with GitLab [LINK]. 

`.github/workflows/cml.yml`

```yaml
name: your-workflow-name

on: [push, pull_request]

jobs:
  run:
    runs-on: [ubuntu-latest]
    container: docker://dvcorg/dvc-cml:latest

    steps:
      - uses: actions/checkout@v2

      - name: dvc_cml_run
      env:
        repo_token: ${{ secrets.GITHUB_TOKEN }}
        repro_targets: your_dvc_target.dvc
      run: |
        # Run report:
        dvc_cml_run
```
_LIST OF FUNCTIONS THAT CAN BE RUN INSIDE?_

### Required input and output arguments
_ELLE: I don't believe any arguments are strictly required. Need confirmation._

## Environmental variables
CML facilitates pushing and pulling large files, such as models and datasets, to remote storage with DVC. If you are using a DVC remote, take note of the environmental variables that must be set according to your remote storage format. 

<details>
  <summary>
  S3 and S3 compatible storage (Minio, DigitalOcean Spaces, IBM Cloud Object Storage...)
  </summary>

```yaml
# Github
env:
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }}
```

> :point_right: AWS_SESSION_TOKEN is optional.

</details>

<details>
  <summary>
  Azure
  </summary>

```yaml
env:
  AZURE_STORAGE_CONNECTION_STRING:
    ${{ secrets.AZURE_STORAGE_CONNECTION_STRING }}
  AZURE_STORAGE_CONTAINER_NAME: ${{ secrets.AZURE_STORAGE_CONTAINER_NAME }}
```

</details>

<details>
  <summary>
  Aliyn
  </summary>

```yaml
env:
  OSS_BUCKET: ${{ secrets.OSS_BUCKET }}
  OSS_ACCESS_KEY_ID: ${{ secrets.OSS_ACCESS_KEY_ID }}
  OSS_ACCESS_KEY_SECRET: ${{ secrets.OSS_ACCESS_KEY_SECRET }}
  OSS_ENDPOINT: ${{ secrets.OSS_ENDPOINT }}
```

</details>

<details>
  <summary>
  Google Storage
  </summary>

> :warning: Normally, GOOGLE_APPLICATION_CREDENTIALS points to the path of the
> json file that contains the credentials. However in the action this variable
> CONTAINS the content of the file. Copy that json and add it as a secret.

```yaml
env:
  GOOGLE_APPLICATION_CREDENTIALS: ${{ secrets.GOOGLE_APPLICATION_CREDENTIALS }}
```

</details>

<details>
  <summary>
  Google Drive
  </summary>

> :warning: After configuring your
> [Google Drive credentials](https://dvc.org/doc/command-reference/remote/add)
> you will find a json file at
> `your_project_path/.dvc/tmp/gdrive-user-credentials.json`. Copy that json and
> add it as a secret.

```yaml
env:
  GDRIVE_CREDENTIALS_DATA: ${{ secrets.GDRIVE_CREDENTIALS_DATA }}
```
</details>

## Secrets

### Required
`GITHUB_TOKEN` - GitHub provides a token that you can use to authenticate on behalf of GitHub Actions. [See here](https://help.github.com/en/actions/configuring-and-managing-workflows/authenticating-with-the-github_token) for steps to configure.

### Optional
DVC support different kinds of remote
[storage](https://dvc.org/doc/command-reference/remote/add). You may need to set secrets in your repository depending on the formate of remote storage. See supported forms of storage and [required secrets for each](#environmental-variables).


## Example use case
Below is an example CML workflow. On every push, this action reproduces a DVC pipeline that trains a model, saves the trained model file to remote storage, and then generates a CML Report comparing a performance metric between the current and previous runs. The environmental variables are configured for AWS remote storage.

```yaml
name: your-workflow-name

on: [push]

jobs:
  run:
    runs-on: [ubuntu-latest]
    container: docker://dvcorg/dvc-cml:latest

    steps:
      - uses: actions/checkout@v2

      - name: dvc_cml_run
      env:
        AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
        AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        repo_token: ${{ secrets.GITHUB_TOKEN }}
      run: |
        # Reproduce training pipeline
        dvc repro train.dvc
        
        # Push the resulting model to remote storage
        dvc add model.pkl
        dvc push 
        
        # Compare a metric associated with the DVC pipeline between commits
        BASELINE=origin/master
        echo "# CML report" >> report.md
        dvc metrics diff --show-json "$BASELINE" | cml-metrics >> report.md
        dvc diff --show-json "$BASELINE" | cml-files >> report.md

        # Create a report in CML
        cml-send-comment report.md
```
