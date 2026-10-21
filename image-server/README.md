# CML image server

A small image server for CML reports, deployed to your own AWS account. Use it
with `cml comment create --publish-url`, now that `asset.cml.dev` no longer
accepts uploads. See [Image Hosting](https://cml.dev/doc/image-hosting) for
other options, such as native uploads on GitLab and Bitbucket.

[`template.yml`](template.yml) is a CloudFormation template that creates:

- a private S3 bucket for the images,
- a Lambda function, whose code is inline in the template, with a public
  [function URL](https://docs.aws.amazon.com/lambda/latest/dg/urls-configuration.html).

The function handles two requests:

- `POST /?token=<token>` stores the request body under the SHA-256 hash of its
  contents and responds with the image URL. Requests without the right token get
  `403`. CML can't send custom headers, so the token goes in the URL.
- `GET /<hash>` serves a stored image to anyone with its URL, which is how
  GitHub, GitLab and Bitbucket display images in comments.

## Deploy

You need the [AWS CLI](https://aws.amazon.com/cli/) and credentials that can
create IAM roles, Lambda functions and S3 buckets.

1. Download the template and generate an upload token:

   ```console
   $ curl -O https://raw.githubusercontent.com/iterative/cml/main/image-server/template.yml
   $ TOKEN=$(openssl rand -hex 32)
   ```

2. Create the stack. Add `--region <region>` to deploy outside your default
   region:

   ```console
   $ aws cloudformation deploy \
       --template-file template.yml \
       --stack-name cml-image-server \
       --capabilities CAPABILITY_IAM \
       --parameter-overrides UploadToken=$TOKEN
   ```

3. Print the publish URL, which is the function URL plus the token:

   ```console
   $ URL=$(aws cloudformation describe-stacks \
       --stack-name cml-image-server \
       --query "Stacks[0].Outputs[?OutputKey=='FunctionUrl'].OutputValue" \
       --output text)
   $ echo "${URL}?token=${TOKEN}"
   https://abcdefghijklmnopqrstuvwxyz012345.lambda-url.us-east-1.on.aws/?token=3f7a...
   ```

4. Check it by uploading an image. The response is the image's URL, which you
   can open in a browser:

   ```console
   $ curl --data-binary @plot.png -H 'Content-Type: image/png' "${URL}?token=${TOKEN}"
   https://abcdefghijklmnopqrstuvwxyz012345.lambda-url.us-east-1.on.aws/9b1c...
   ```

Treat the publish URL as a secret, because the token in it allows uploads. Image
URLs don't contain the token.

## Use it in CI

Save the publish URL as a CI secret named `CML_COMMENT_PUBLISH_URL`. CML reads
it from the environment, so `cml comment create report.md` uploads local images
to your server. For example, in GitHub Actions:

```yaml
- name: Create CML report
  env:
    REPO_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    CML_COMMENT_PUBLISH_URL: ${{ secrets.CML_COMMENT_PUBLISH_URL }}
  run: |
    echo '![](./plot.png "Confusion Matrix")' >> report.md
    cml comment create report.md
```

On GitLab and Bitbucket, a CI/CD variable or repository variable with that name
is enough, without changing the pipeline. See
[Image Hosting](https://cml.dev/doc/image-hosting#use-it-in-your-workflow) for
details. `cml asset publish` reads the same URL from `CML_ASSET_URL`.

## Operate

- **Rotate the token**: run step 2 again with a new `TOKEN` and update the CI
  secret. Images uploaded before keep working.
- **Limits**: function URLs accept requests and responses up to 6 MB, so files
  can be up to about 4 MB.
- **Cost**: S3 storage plus one Lambda invocation per upload or image view,
  which is usually well within the AWS free tier for CI reports. Images are kept
  until you delete them. To expire old ones, add a
  [lifecycle rule](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lifecycle-mgmt.html)
  to the bucket. Reports that link to deleted images will show broken images.
- **Remove**: empty the bucket, then delete the stack:

  ```console
  $ BUCKET=$(aws cloudformation describe-stacks \
      --stack-name cml-image-server \
      --query "Stacks[0].Outputs[?OutputKey=='Bucket'].OutputValue" \
      --output text)
  $ aws s3 rm "s3://${BUCKET}" --recursive
  $ aws cloudformation delete-stack --stack-name cml-image-server
  ```

If your organization doesn't allow public Lambda function URLs, you can run the
same handler behind API Gateway or any other HTTPS endpoint.

## Test

[`test_template.py`](test_template.py) runs the inline Lambda code against a
mocked S3 bucket:

```console
$ pip install boto3 'moto[s3]' pytest pyyaml
$ pytest image-server
```
