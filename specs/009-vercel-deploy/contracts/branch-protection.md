# Branch Protection Configuration Contract

**Target Branch**: `main`

This document specifies the GitHub branch protection rules required for the deployment infrastructure.

## Required Settings

### Status Checks

| Setting | Value | Rationale |
|---------|-------|-----------|
| Require status checks to pass before merging | ✓ Enabled | FR-005: Block deployment if checks fail |
| Require branches to be up to date before merging | ✓ Enabled | Ensures CI runs against latest main |
| Status checks that are required | `quality` | Job name from ci.yml workflow |

### Enforcement

| Setting | Value | Rationale |
|---------|-------|-----------|
| Include administrators | ✓ Enabled | No bypass for anyone |
| Restrict who can push to matching branches | Optional | Team-specific decision |
| Allow force pushes | ✗ Disabled | Protect deployment history |
| Allow deletions | ✗ Disabled | Protect main branch |

## Configuration Steps (Manual via GitHub UI)

1. Navigate to: **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Enable: **Require status checks to pass before merging**
4. Search and select: `quality` (appears after first CI run)
5. Enable: **Require branches to be up to date before merging**
6. Enable: **Include administrators**
7. Click: **Create** or **Save changes**

## Verification

After configuration, verify by:

1. Creating a PR with intentional lint error
2. Confirming merge is blocked until CI passes
3. Fixing the error and confirming merge becomes available

## JSON Representation (for API/Terraform)

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["quality"]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": null,
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false
}
```

