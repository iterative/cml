terraform {
  required_providers {
    iterative = {
      versions = ["0.1"]
      source = "github.com/iterative/iterative"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  region = "us-west-1"
  instance_ami = "ami-03ba3948f6c37a4b0"
}
