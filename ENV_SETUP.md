# Environment Variables Setup Guide

## Quick Start

1. **Copy the example file:**
   - The `.env.example` file contains a template with all required variables
   - Copy it to `.env.local` (or create `.env.local` manually)

2. **Fill in your API keys:**
   - Open `.env.local` in your editor
   - Replace all placeholder values with your actual API keys
   - See sections below for where to get each key

3. **Restart your development server:**
   - After adding/updating environment variables, restart Next.js:
     ```powershell
     npm run dev
     ```

---

## Required Environment Variables

### 🔴 Critical (Required for app to work)

#### Supabase (Database & Auth)
- **NEXT_PUBLIC_SUPABASE_URL**: Your Supabase project URL
  - Get it from: https://app.supabase.com/project/_/settings/api
  - Format: `https://xxxxx.supabase.co`
  
- **NEXT_PUBLIC_SUPABASE_ANON_KEY**: Your Supabase anonymous/public key
  - Get it from: https://app.supabase.com/project/_/settings/api
  - This is safe to expose in client-side code
  
- **SUPABASE_SERVICE_ROLE_KEY**: Your Supabase service role key (admin)
  - Get it from: https://app.supabase.com/project/_/settings/api
  - ⚠️ **KEEP THIS SECRET!** Never expose this in client-side code
  - Used for admin operations like creating users

#### OpenAI (AI Feedback & Coaching)
- **OPENAI_API_KEY**: Your OpenAI API key
  - Get it from: https://platform.openai.com/api-keys
  - Create a new secret key if you don't have one
  - ⚠️ **KEEP THIS SECRET!** This key has billing access

---

## Optional Environment Variables

### 🟡 Recommended (For full functionality)

#### Mixpanel (Analytics)
- **NEXT_PUBLIC_MIXPANEL_TOKEN**: Your Mixpanel project token
  - Get it from: https://mixpanel.com/project/settings
  - Used for tracking user behavior and analytics
  - App will work without this, but analytics won't be tracked

#### Resend (Email Service)
- **RESEND_API_KEY**: Your Resend API key
  - Get it from: https://resend.com/api-keys
  - Used for sending founder call confirmation emails
  - App will work without this, but email notifications won't be sent

#### Cal.com (Meeting Booking)
- **CAL_COM_API_KEY**: Your Cal.com API key
  - Get it from: https://app.cal.com/settings/developer/api-keys
  - Used for booking founder calls
  
- **CAL_COM_EVENT_TYPE_ID**: Your Cal.com event type ID
  - Get it from your Cal.com event type settings
  - Format: Usually a number like `123456`
  
- **CAL_COM_USERNAME**: Your Cal.com username
  - Your Cal.com account username
  - Used in meeting URLs

#### Founder Email
- **FOUNDER_EMAIL**: Email address to receive founder call notifications
  - Used when someone books a founder call
  - Can be any email address

---

## How to Get Your API Keys

### Supabase Setup
1. Go to https://app.supabase.com
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ Keep secret!)

### OpenAI Setup
1. Go to https://platform.openai.com
2. Sign in or create an account
3. Go to **API Keys** section
4. Click **Create new secret key**
5. Copy the key → `OPENAI_API_KEY` (⚠️ Keep secret! You won't see it again)

### Mixpanel Setup (Optional)
1. Go to https://mixpanel.com
2. Create a project or select existing
3. Go to **Project Settings**
4. Copy **Token** → `NEXT_PUBLIC_MIXPANEL_TOKEN`

### Resend Setup (Optional)
1. Go to https://resend.com
2. Sign up or log in
3. Go to **API Keys**
4. Create a new API key
5. Copy the key → `RESEND_API_KEY`

### Cal.com Setup (Optional)
1. Go to https://cal.com
2. Sign in to your account
3. Go to **Settings** → **Developer** → **API Keys**
4. Create a new API key → `CAL_COM_API_KEY`
5. Go to your event type settings to get → `CAL_COM_EVENT_TYPE_ID`
6. Your username is in your profile → `CAL_COM_USERNAME`

---

## Security Best Practices

1. **Never commit `.env.local` to git**
   - It's already in `.gitignore`
   - Only commit `.env.example` (which has no real keys)

2. **Use different keys for development and production**
   - Development: Use `.env.local`
   - Production: Set environment variables in your hosting platform (Vercel, etc.)

3. **Rotate keys if exposed**
   - If you accidentally commit a key, immediately revoke it and create a new one

4. **Limit API key permissions**
   - Use the minimum permissions needed
   - For OpenAI, set usage limits if possible

---

## Troubleshooting

### "Cannot find module" errors
- Make sure you've restarted your dev server after adding environment variables
- Next.js only reads `.env.local` on startup

### API calls failing
- Check that your API keys are correct (no extra spaces)
- Verify the keys are active and have proper permissions
- Check your API usage/billing limits

### Environment variables not loading
- Make sure the file is named exactly `.env.local` (not `.env` or `.env.development`)
- Restart your Next.js dev server
- Check for typos in variable names (they're case-sensitive)

---

## File Structure

```
locuta.ai/
├── .env.example          ← Template (safe to commit)
├── .env.local            ← Your actual keys (DO NOT COMMIT)
└── .gitignore           ← Already excludes .env.local
```

---

## Next Steps

After setting up your environment variables:

1. ✅ Fill in at minimum: Supabase and OpenAI keys
2. ✅ Restart your dev server: `npm run dev`
3. ✅ Test the app to make sure everything works
4. ✅ Add optional keys as needed for full functionality

Need help? Check the individual service documentation or contact support.
