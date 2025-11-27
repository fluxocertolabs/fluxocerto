# Quickstart: Vercel Deployment Infrastructure

**Branch**: `009-vercel-deploy` | **Time to complete**: ~15 minutes

This guide walks through setting up automated deployments for the Family Finance application.

---

## Prerequisites

- [ ] GitHub repository with admin access
- [ ] Vercel account (free tier is sufficient)
- [ ] Supabase project already configured (see spec-008)

---

## Step 1: Connect Vercel to GitHub (5 min)

### 1.1 Import Project

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Authorize Vercel to access your GitHub account (if not already)
5. Find and select `family-finance` repository
6. Click **"Import"**

### 1.2 Configure Project Settings

On the import configuration screen:

| Setting | Value |
|---------|-------|
| Framework Preset | Vite (auto-detected) |
| Root Directory | `.` (default) |
| Build Command | `pnpm build` (auto-detected) |
| Output Directory | `dist` (auto-detected) |
| Install Command | `pnpm install` (auto-detected) |

Click **"Deploy"** (this first deployment will fail - that's expected, we need to add environment variables).

---

## Step 2: Configure Environment Variables (3 min)

### 2.1 Add Supabase Variables

1. In Vercel Dashboard, go to your project
2. Navigate to **Settings** → **Environment Variables**
3. Add each variable:

| Name | Value | Environments |
|------|-------|--------------|
| `VITE_SUPABASE_URL` | `https://your-project-ref.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Production, Preview, Development |

**Where to find these values:**
- Supabase Dashboard → Project Settings → API
- Copy "Project URL" for `VITE_SUPABASE_URL`
- Copy "anon public" key for `VITE_SUPABASE_ANON_KEY`

### 2.2 Redeploy

After adding variables:
1. Go to **Deployments** tab
2. Find the failed deployment
3. Click **"..."** → **"Redeploy"**
4. Wait for deployment to complete (~1-2 min)

---

## Step 3: Create CI Workflow (2 min)

### 3.1 Add Workflow File

Create `.github/workflows/ci.yml` with the content from `contracts/ci-workflow.yml`:

```bash
# From repository root
mkdir -p .github/workflows
cp specs/009-vercel-deploy/contracts/ci-workflow.yml .github/workflows/ci.yml
```

### 3.2 Commit and Push

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add quality checks workflow"
git push origin main
```

### 3.3 Verify CI Runs

1. Go to GitHub repository → **Actions** tab
2. You should see "CI" workflow running
3. Wait for it to complete (green checkmark)

---

## Step 4: Configure Branch Protection (3 min)

### 4.1 Enable Protection Rules

1. Go to GitHub repository → **Settings** → **Branches**
2. Click **"Add branch protection rule"** (or edit existing)
3. Configure:

| Setting | Value |
|---------|-------|
| Branch name pattern | `main` |
| Require status checks to pass before merging | ✓ |
| Status checks that are required | `quality` |
| Require branches to be up to date before merging | ✓ |
| Include administrators | ✓ |

4. Click **"Create"** or **"Save changes"**

---

## Step 5: Add Vercel Configuration (Optional) (1 min)

If Vercel doesn't auto-detect settings correctly, add `vercel.json`:

```bash
cp specs/009-vercel-deploy/contracts/vercel-config.json vercel.json
git add vercel.json
git commit -m "chore: add vercel configuration"
git push origin main
```

---

## Verification Checklist

### Test Production Deployment

- [ ] Push to `main` branch
- [ ] CI workflow runs and passes
- [ ] Vercel deployment triggers automatically
- [ ] Production URL shows the application
- [ ] Application connects to Supabase successfully

### Test Preview Deployment

- [ ] Create a new branch: `git checkout -b test-preview`
- [ ] Make a small change (e.g., add a comment)
- [ ] Push and create a PR
- [ ] CI workflow runs on PR
- [ ] Vercel creates preview deployment
- [ ] Preview URL appears in PR comments
- [ ] Preview deployment works correctly

### Test Quality Gates

- [ ] Create a branch with intentional lint error
- [ ] Push and create a PR
- [ ] CI fails on lint step
- [ ] Merge is blocked (branch protection working)

---

## Troubleshooting

### CI Workflow Not Running

**Symptom**: No workflow appears in Actions tab

**Solutions**:
1. Verify `.github/workflows/ci.yml` exists and is valid YAML
2. Check workflow file is on `main` branch (or PR target)
3. Ensure GitHub Actions is enabled for the repository

### Vercel Deployment Fails

**Symptom**: Deployment shows error in Vercel dashboard

**Solutions**:
1. Check environment variables are set correctly
2. Verify `pnpm build` works locally
3. Check Vercel build logs for specific error

### Preview URL Not Appearing in PR

**Symptom**: Vercel deploys but doesn't comment on PR

**Solutions**:
1. Verify Vercel GitHub App has correct permissions
2. Check Vercel project settings → Git → "Comment on Pull Requests" is enabled

### Branch Protection Not Working

**Symptom**: Can merge without CI passing

**Solutions**:
1. Verify "quality" check name matches job name in workflow
2. Wait for first CI run to complete (check must exist before it can be required)
3. Ensure "Include administrators" is checked

---

## URLs Reference

After setup, you'll have:

| Environment | URL Pattern |
|-------------|-------------|
| Production | `https://family-finance-*.vercel.app` or custom domain |
| Preview | `https://family-finance-*-*.vercel.app` (unique per PR) |
| Local Dev | `http://localhost:5173` |

---

## Next Steps

1. **Custom Domain**: Configure in Vercel Dashboard → Domains
2. **Notifications**: Set up Slack/Discord webhooks if desired
3. **Analytics**: Enable Vercel Analytics for performance monitoring

