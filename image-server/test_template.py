"""Tests for the inline Lambda code in template.yml, against a mocked S3."""

import base64
import hashlib
from pathlib import Path

import boto3
import pytest
import yaml
from moto import mock_aws

TEMPLATE = Path(__file__).with_name("template.yml")
TOKEN = "0123456789abcdef0123456789abcdef"
DOMAIN = "abc123.lambda-url.us-east-1.on.aws"
PNG = b"\x89PNG\r\n\x1a\n" + bytes(range(256))


class TemplateLoader(yaml.SafeLoader):
    pass


for tag in ("!Ref", "!GetAtt", "!Sub"):
    TemplateLoader.add_constructor(tag, lambda loader, node: loader.construct_scalar(node))


@pytest.fixture
def server(monkeypatch):
    template = yaml.load(TEMPLATE.read_text(), Loader=TemplateLoader)
    code = template["Resources"]["Function"]["Properties"]["Code"]["ZipFile"]
    monkeypatch.setenv("AWS_DEFAULT_REGION", "us-east-1")
    monkeypatch.setenv("BUCKET", "images")
    monkeypatch.setenv("UPLOAD_TOKEN", TOKEN)
    with mock_aws():
        boto3.client("s3").create_bucket(Bucket="images")
        module = {}
        exec(compile(code, "index.py", "exec"), module)
        yield module["handler"]


def event(method, path="/", body=None, content_type=None, token=None, binary=True):
    """Build a Lambda function URL (payload format 2.0) event."""
    result = {
        "rawPath": path,
        "headers": {"content-type": content_type} if content_type else {},
        "requestContext": {"domainName": DOMAIN, "http": {"method": method}},
        "isBase64Encoded": False,
    }
    if token is not None:
        result["queryStringParameters"] = {"token": token}
    if body is not None:
        result["body"] = base64.b64encode(body).decode() if binary else body.decode()
        result["isBase64Encoded"] = binary
    return result


def test_upload_and_download(server):
    response = server(event("POST", body=PNG, content_type="image/png", token=TOKEN), None)
    key = hashlib.sha256(PNG).hexdigest()
    assert response == {"statusCode": 200, "body": f"https://{DOMAIN}/{key}"}

    response = server(event("GET", f"/{key}"), None)
    assert response["statusCode"] == 200
    assert response["isBase64Encoded"]
    assert base64.b64decode(response["body"]) == PNG
    assert response["headers"]["Content-Type"] == "image/png"
    assert "immutable" in response["headers"]["Cache-Control"]


def test_upload_text_body(server):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg"/>'
    response = server(
        event("POST", body=svg, content_type="image/svg+xml", token=TOKEN, binary=False), None
    )
    key = hashlib.sha256(svg).hexdigest()
    assert response["body"].endswith(f"/{key}")
    assert base64.b64decode(server(event("GET", f"/{key}"), None)["body"]) == svg


@pytest.mark.parametrize("token", [None, "", "wrong", TOKEN + "x"])
def test_upload_requires_token(server, token):
    response = server(event("POST", body=PNG, content_type="image/png", token=token), None)
    # No body, so CML reports "Empty response from asset backend with status code 403"
    assert response == {"statusCode": 403}
    key = hashlib.sha256(PNG).hexdigest()
    assert server(event("GET", f"/{key}"), None)["statusCode"] == 404


def test_upload_empty(server):
    assert server(event("POST", token=TOKEN), None) == {"statusCode": 400}


@pytest.mark.parametrize("path", ["/", "/" + "0" * 64, "/../template.yml", "/ABC"])
def test_download_missing_or_invalid(server, path):
    assert server(event("GET", path), None) == {"statusCode": 404}


def test_other_methods(server):
    assert server(event("PUT", body=PNG, token=TOKEN), None) == {"statusCode": 405}
