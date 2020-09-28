terraform {
  required_providers {
    iterative = {
      versions = ["0.1.3"]
      source = "iterative/iterative"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  region = "us-west-1"
}
