terraform {
  required_providers {
    davidgortega = {
      versions = ["0.2"]
      source = "github.com/davidgortega/davidgortega"
    }
  }
}

provider "davidgortega" {}

resource "davidgortega_machine" "machine" {
  region = "us-west-1"
  instance_ami = "ami-03ba3948f6c37a4b0"
}
