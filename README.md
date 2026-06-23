# VigilPhish — Vercel Edition

AI-powered phishing detection. Built with Next.js for seamless Vercel deployment.

## Deploy to Vercel

### Step 1 — Push to GitHub
1. Create a new repo on github.com (name it `vigilphish`)
2. Upload all these files (drag & drop the folder, or use GitHub Desktop)
3. Commit and push to `main`

### Step 2 — Deploy on Vercel
1. Go to vercel.com → New Project → Import your GitHub repo
2. Vercel auto-detects Next.js — no settings to change
3. Before deploying, add this Environment Variable:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your Anthropic API key (get one at console.anthropic.com)
4. Click Deploy

That's it! Your app will be live at `your-project.vercel.app`

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | ✅ Yes | From console.anthropic.com |

## Features
- AI phishing analysis (Claude claude-sonnet-4-5)
- OpenPhish URL threat feed checking
- Domain age WHOIS lookup
- Screenshot OCR (upload image → extract text → analyze)
- Scan history (stored in browser localStorage)
- Share results to clipboard
