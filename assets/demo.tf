terraform {
  required_providers {
    iterative = {
      versions = ["0.3.0"]
      source = "DavidGOrtega/iterative"
    }
  }
}

provider "iterative" {}

resource "iterative_machine" "machine" {
  region = "us-west-1"
}
