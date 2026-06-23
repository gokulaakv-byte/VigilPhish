import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function extractUrls(text: string): string[] {
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const matches = text.match(urlRegex) || []
  return [...new Set(matches.map(u => u.toLowerCase()))]
}

async function getOpenPhishFeed(): Promise<Set<string>> {
  try {
    const res = await fetch('https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt')
    if (!res.ok) return new Set()
    const text = await res.text()
    return new Set(text.split('\n').map(l => l.trim().toLowerCase()).filter(Boolean))
  } catch {
    return new Set()
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const urls = extractUrls(message)
    const openPhishUrls = urls.length > 0 ? await getOpenPhishFeed() : new Set<string>()

    const urlCheckResults: Array<{ url: string; flagged: boolean }> = urls.map(url => ({
      url,
      flagged: openPhishUrls.has(url),
    }))

    const flaggedCount = urlCheckResults.filter(u => u.flagged).length
    let virusTotalContext = ''
    if (flaggedCount > 0) {
      virusTotalContext = `\n\nOpenPhish database: ${flaggedCount} URL(s) flagged as known phishing URLs. Increase the phishing score accordingly.`
    }

    const systemPrompt = `You are a phishing detection expert. Analyze the message the user provides and return a JSON object with these exact fields:
- score: a number from 0 to 100 (0 = definitely safe, 100 = definitely phishing)
- verdict: one of 'Safe', 'Suspicious', or 'Phishing'
- reasons: an array of exactly 3 short strings explaining the top risk signals you found
- recommendation: one sentence telling the user what to do

IMPORTANT SCORING RULES:
- A Gmail or personal email sender alone is NOT sufficient to score above 60 or assign a Phishing verdict.
- High scores (>60) and Phishing verdicts require MULTIPLE signals combined, such as:
  * Urgency language ("act now", "verify immediately", "confirm within 24 hours", etc.)
  * Requests for sensitive documents or credentials
  * Suspicious URLs (flagged by OpenPhish)
  * Domain spoofing or newly registered domains
  * Threatening language or unusual sender behavior
- If the only signal is a personal/Gmail sender, assign a low score (0-30) and Safe verdict.
- Always require at least 2-3 corroborating signals before assigning Suspicious (40-69) or Phishing (70-100) verdicts.

Return only the JSON object. No markdown, no explanation.${virusTotalContext}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type')

    const cleaned = content.text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleaned)

    return res.status(200).json({ ...result, urlCheckResults })
  } catch (err: any) {
    console.error('Analyze error:', err)
    return res.status(500).json({ error: err.message || 'Analysis failed' })
  }
}
