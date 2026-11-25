# Provider configuration. No credential is read from this repository: the
# pipeline authenticates by workload identity federation, and a developer by
# their own login (ADR-0002, point 2; NFR-31).

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region

  # Every resource carries a component label, for cost visibility (ADR-0001, point 5).
  default_labels = {
    product = "promenade"
  }
}

provider "cloudflare" {}
