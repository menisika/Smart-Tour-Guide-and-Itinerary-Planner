# Infrastructure

Terraform for the cloud deployment of Promenade (ADR-0001, ADR-0002). **It declares no resource.** The folder pins the tool and its providers so that the first resource is added to a configuration that already validates in the pipeline.

|                         | Version                                       | Why it is here                                                  |
| ----------------------- | --------------------------------------------- | --------------------------------------------------------------- |
| Terraform               | `>= 1.17.0, < 2.0.0` (1.17.2 in the pipeline) | ADR-0002                                                        |
| `hashicorp/google`      | 8.12.0                                        | Cloud Run, Firebase, Secret Manager, Cloud Scheduler (ADR-0001) |
| `cloudflare/cloudflare` | 5.29.0                                        | R2 buckets (ADR-0010)                                           |

`.terraform.lock.hcl` records the checksums of both providers for Linux (x86-64) and macOS (Apple silicon). `terraform init` unpacks the providers into `infra/.terraform` — about 330 MB, ignored by git, and safe to delete.

## Checking it

```bash
terraform -chdir=infra fmt -check -recursive
```

```bash
terraform -chdir=infra init -backend=false
```

```bash
terraform -chdir=infra validate
```

`-backend=false` is deliberate. State is to live in a Cloud Storage bucket (ADR-0002), and that bucket does not exist; `versions.tf` declares the backend without a bucket name, which is supplied at `terraform init -backend-config="bucket=…"` once there is one.

## Not decided here

- **Neon has no provider pinned.** Its official provider is in beta (`neondatabase/neon` 0.19.0-beta.4 on 24 November 2026) and a community one exists (`kislerdm/neon` 0.18.0). Whether the one database is described in Terraform at all, and with which provider, is the owner's decision when the database is created.
- **The region** defaults to `europe-west1`; ADR-0001 leaves the choice to the moment the database's region is known.

## Rules that the first resources must keep

- Only features that OpenTofu also has (ADR-0002, point 1).
- Every resource carries a component label (ADR-0001, point 5).
- No long-lived key: the pipeline uses workload identity federation (ADR-0002, point 2).
- One scheduler job, at most three alert conditions, secrets bundled (ADR-0024).
