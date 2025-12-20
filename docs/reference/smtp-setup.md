# SMTP Setup Guide: Resend for Production Email Delivery

**Time Required**: ~30 minutes  
**Prerequisites**: Access to `fluxocerto.app` domain DNS, Supabase Dashboard access

## Overview

This guide walks you through setting up Resend as the email provider for Magic Link authentication in production. After completing this setup, family members will receive real Magic Link emails when logging in.

## Step 1: Create Resend Account (5 minutes)

1. Go to [resend.com](https://resend.com)
2. Click "Get Started" and create an account
3. Verify your email address
4. You're now on the free tier (3,000 emails/month, 100/day)

## Step 2: Add and Verify Domain (15-20 minutes)

### 2.1 Add Domain in Resend

1. In Resend Dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter: `fluxocerto.app`
4. Select your preferred region (default is fine)
5. Click **Add**

### 2.2 Configure DNS Records

Resend will show you DNS records to add. You need to add these to your domain's DNS settings:

**Required Records:**

| Type | Name | Value |
|------|------|-------|
| TXT | `@` or `fluxocerto.app` | SPF record (provided by Resend) |
| TXT | `resend._domainkey` | DKIM key (provided by Resend) |

**Optional but Recommended:**

| Type | Name | Value |
|------|------|-------|
| TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:your-email@example.com` |

### 2.3 Add Records to DNS Provider

1. Log into your domain registrar or DNS provider
2. Navigate to DNS settings for `fluxocerto.app`
3. Add the TXT records exactly as shown by Resend
4. **Important**: Copy the full DKIM value (it's long!)

### 2.4 Verify Domain

1. Return to Resend Dashboard → Domains
2. Click **Verify** next to `fluxocerto.app`
3. If verification fails, wait 5-10 minutes for DNS propagation
4. DNS can take up to 48 hours to propagate (usually much faster)

**Troubleshooting DNS Issues:**
- Check if your DNS provider auto-appends the domain name
- Ensure no extra quotes or spaces in record values
- Use [dnschecker.org](https://dnschecker.org) to verify propagation

## Step 3: Create API Key (2 minutes)

1. In Resend Dashboard, go to **API Keys**
2. Click **Create API Key**
3. Configure:
   - **Name**: `supabase-fluxo-certo-production`
   - **Permission**: `Sending access`
   - **Domain**: `fluxocerto.app`
4. Click **Create**
5. **Copy the API key immediately** (it's only shown once!)

## Step 4: Configure Supabase Settings (5 minutes)

### 4.1 Configure Site URL (⚠️ Critical!)

The Site URL determines the base URL used in Magic Link emails. **If this is wrong, email links will point to localhost!**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your Fluxo Certo project
3. Navigate to **Project Settings** → **Authentication**
4. Under **URL Configuration**:
   - **Site URL**: Set to `https://fluxocerto.app`
   - **Redirect URLs**: Add:
     - `https://fluxocerto.app/auth/confirm`
     - `http://localhost:5173/auth/confirm` (for local dev)
5. Click **Save**

### 4.2 Configure SMTP Settings

1. Still in **Project Settings** → **Authentication**
2. Scroll down to **SMTP Settings**
3. Toggle **Enable Custom SMTP** to ON
4. Enter the following:

| Setting | Value |
|---------|-------|
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | (paste your Resend API key) |
| Sender email | `noreply@fluxocerto.app` |
| Sender name | `Fluxo Certo` |

5. Click **Save**

## Step 5: Test Email Delivery (5 minutes)

### 5.1 Test in Production

1. Open your production Fluxo Certo app
2. Enter an approved email address on the login page
3. Click "Send Magic Link"
4. Check your real email inbox (and spam folder)
5. Magic Link email should arrive within 30 seconds

### 5.2 Verify Email Details

- **From**: Should show `noreply@fluxocerto.app`
- **Subject**: Should be Supabase's default Magic Link subject
- **Link**: Should point to `https://fluxocerto.app/auth/confirm?...` (NOT localhost!)
- **Link**: Should work and complete authentication

### 5.3 Verify Local Development Unchanged

1. Run `supabase start` locally
2. Request a Magic Link in the local app
3. Go to `http://localhost:54324` (Inbucket)
4. Email should appear in Inbucket (NOT sent via Resend)

## Verification Checklist

- [ ] Resend account created
- [ ] Domain `fluxocerto.app` verified in Resend
- [ ] API key created with "Sending access" permission
- [ ] **Site URL** set to `https://fluxocerto.app` in Supabase Dashboard
- [ ] **Redirect URLs** include `https://fluxocerto.app/auth/confirm`
- [ ] Supabase SMTP configured with Resend credentials
- [ ] Production Magic Link emails delivered successfully
- [ ] Magic Link URL in email points to `https://fluxocerto.app` (NOT localhost!)
- [ ] Sender shows `noreply@fluxocerto.app`
- [ ] Repository contains no secrets
- [ ] Local development still uses Inbucket

## Troubleshooting

### Magic Link Points to Localhost

**Symptom**: Email arrives but the link contains `localhost` or `127.0.0.1` instead of your production domain.

**Cause**: The **Site URL** in Supabase Dashboard is not configured correctly.

**Fix**:
1. Go to Supabase Dashboard → **Project Settings** → **Authentication**
2. Under **URL Configuration**, set **Site URL** to `https://fluxocerto.app`
3. Click **Save**
4. Request a new Magic Link - the email should now contain the correct URL

### Email Not Arriving

1. **Check spam folder** - First login emails sometimes get filtered
2. **Verify domain status** - Ensure domain is verified in Resend Dashboard
3. **Check Resend logs** - Dashboard shows delivery status
4. **Verify SMTP settings** - Double-check all values in Supabase Dashboard

### Domain Not Verifying

1. **Wait for DNS propagation** - Can take up to 48 hours
2. **Check record values** - Ensure exact match with Resend's provided values
3. **Check DNS provider** - Some providers auto-append domain names
4. **Use DNS checker** - [dnschecker.org](https://dnschecker.org) to verify records

### Rate Limits

- **Daily limit**: 100 emails/day (free tier)
- **Monthly limit**: 3,000 emails/month (free tier)
- If limits are hit, users won't receive emails until reset
- Monitor usage in Resend Dashboard

## Security Notes

- ✅ API key is stored only in Supabase Dashboard (not in code)
- ✅ Repository contains no production secrets
- ✅ API key has minimal permissions ("Sending access" only)
- ✅ API key is restricted to `fluxocerto.app` domain
- ⚠️ Never share or commit the API key

## Monitoring

Resend Dashboard provides:
- Delivery statistics
- Bounce/complaint tracking
- API usage metrics

Check the dashboard periodically to ensure healthy email delivery.

---

**Setup Complete!** Family members can now receive real Magic Link emails in production.

