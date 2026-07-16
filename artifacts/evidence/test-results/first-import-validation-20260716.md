# First Import Validation — 2026-07-16

## Scope

- Consuming repo: `AI-Slide-Design-System-Repo`
- Framework topology: submodule at `additional/ai-governance-framework`
- Pinned framework commit: `634c9b8617bd792fb8dcd45e89ecfbb23eb8e69a`
- Initial consuming-repo commit: `0c2b08d7f48754d326ec4911d22586562b83b516`

## Validation results

| Surface | Command | Result |
| --- | --- | --- |
| Product vertical slice | `npm.cmd run check` | PASS — semantic model tests, lint, render consistency, and Slidev production build completed |
| Hook installation | `python -X utf8 additional/ai-governance-framework/governance_tools/hook_install_validator.py --repo . --framework-root additional/ai-governance-framework` | PASS — `valid=True` |
| Quickstart runtime | `python -X utf8 additional/ai-governance-framework/governance_tools/quickstart_smoke.py --project-root . --plan PLAN.md --contract contract.yaml --task-text "Build the Phase A semantic Slidev vertical slice" --format human` | PASS — `ok=True`, `pre_task_ok=True`, `session_start_ok=True` |
| Runtime surface manifest | `python -X utf8 additional/ai-governance-framework/governance_tools/runtime_surface_manifest_smoke.py --repo-root additional/ai-governance-framework --format human` | PASS — `ok=True`, no unknown or orphan surfaces |
| Consuming-repo runtime smoke | `python -X utf8 additional/ai-governance-framework/governance_tools/external_repo_smoke.py --repo . --contract contract.yaml --format human` | PASS — `ok=True`, `pre_task_ok=True`, `session_start_ok=True` |
| Version compatibility | `python -X utf8 additional/ai-governance-framework/governance_tools/governance_version_check.py --required-versions additional/ai-governance-framework/governance/runtime/required_versions.yaml --version-manifest .governance/version_manifest.yaml --json` | PASS — verdict `compatible` |
| Baseline provenance | `python -X utf8 additional/ai-governance-framework/governance_tools/adopt_governance.py --target . --framework-root additional/ai-governance-framework --refresh` | PASS — baseline now records source commit `0c2b08d7...` |

## Known limitations and non-claims

- `run_first_import_validation.py` was not retained as evidence because it assumes root-level `governance_tools/` and `runtime_hooks/`; it does not resolve the approved submodule path and generated false path failures.
- Framework source canonicality remains a warning: the approved GitLab remote differs from the checker’s hard-coded GitHub canonical remote.
- This onboarding did not run F-7 and produced no `governance/.update-receipt.json`; report the framework import as `manual_update`, not `updated`, `latest`, or `full_update_completed`.
- Runtime smoke proves the commands passed in this checkout. It does not prove framework correctness, CI enforcement on other machines, visual polish, or complete governance adoption.
