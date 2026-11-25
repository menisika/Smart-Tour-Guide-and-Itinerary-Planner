variable "gcp_project_id" {
  description = "Identifier of the Google Cloud project that holds the deployment."
  type        = string
}

variable "gcp_region" {
  description = "Region of the Cloud Run services and jobs: a Tier 1 European region next to the database's region (ADR-0001, point 2; ADR-0010, point 8)."
  type        = string
  default     = "europe-west1"
}
