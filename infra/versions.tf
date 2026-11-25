# Infrastructure as code for Promenade (ADR-0002).
#
# This folder pins the tool and its providers and declares no resource yet:
# nothing here creates anything, and `terraform apply` has nothing to do.
#
# Only features that OpenTofu also has are used, so that switching is a change
# of one command (ADR-0002, point 1).

terraform {
  required_version = ">= 1.17.0, < 2.0.0"

  required_providers {
    # Cloud Run, Firebase, Secret Manager, Cloud Scheduler (ADR-0001).
    google = {
      source  = "hashicorp/google"
      version = "8.12.0"
    }

    # R2 buckets (ADR-0010).
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "5.29.0"
    }
  }

  # State lives in a Cloud Storage bucket (ADR-0002, point 1). The bucket does
  # not exist yet, so its name is not written here: it is given at
  # `terraform init -backend-config="bucket=..."` once it does. Until then,
  # `terraform init -backend=false` is the only form that makes sense.
  backend "gcs" {}
}
