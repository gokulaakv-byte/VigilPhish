import type { NextApiRequest, NextApiResponse } from 'next'

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
    if (urls.length === 0) {
      return res.status(200).json({ urls: [], flaggedUrls: [], totalChecked: 0, threatCount: 0 })
    }

    const openPhishUrls = await getOpenPhishFeed()
    const flaggedUrls = urls.map(url => ({ url, isFlagged: openPhishUrls.has(url) }))
    const threatCount = flaggedUrls.filter(u => u.isFlagged).length

    return res.status(200).json({ urls, flaggedUrls, totalChecked: urls.length, threatCount })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'URL check failed' })
  }
}
