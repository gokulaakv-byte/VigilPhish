import type { NextApiRequest, NextApiResponse } from 'next'

function extractDomain(url: string): string {
  try {
    let d = url.replace(/^https?:\/\//, '').replace(/^www\./, '')
    d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0]
    return d.toLowerCase()
  } catch { return '' }
}

function extractDomainsFromText(text: string): string[] {
  const domains = new Set<string>()
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi
  const urls = text.match(urlRegex) || []
  urls.forEach(url => { const d = extractDomain(url); if (d) domains.add(d) })

  const emailRegex = /[a-zA-Z0-9._%-]+@([a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+)/gi
  let m
  while ((m = emailRegex.exec(text)) !== null) {
    if (m[1]) domains.add(m[1].toLowerCase())
  }
  return Array.from(domains)
}

async function getWhoisData(domain: string): Promise<{ createdDate: string; ageInDays: number } | null> {
  try {
    const res = await fetch(`https://whoisjson.com/api/v1/whois?domain=${encodeURIComponent(domain)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.registrar?.createdDate) {
      const createdDate = data.registrar.createdDate
      const ageInDays = Math.floor((Date.now() - new Date(createdDate).getTime()) / (1000 * 60 * 60 * 24))
      return { createdDate, ageInDays }
    }
  } catch { /* ignore */ }
  return null
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { message } = req.body
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' })
  }

  try {
    const domains = extractDomainsFromText(message)
    if (domains.length === 0) {
      return res.status(200).json({ domains: [], domainAges: [], suspiciousDomains: [] })
    }

    const domainAges = await Promise.all(domains.map(async domain => {
      const whois = await getWhoisData(domain)
      const isSuspicious = whois !== null && whois.ageInDays < 30
      return {
        domain,
        createdDate: whois?.createdDate ?? null,
        ageInDays: whois?.ageInDays ?? null,
        isSuspicious,
      }
    }))

    const suspiciousDomains = domainAges.filter(d => d.isSuspicious)
    return res.status(200).json({ domains, domainAges, suspiciousDomains })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Domain age check failed' })
  }
}
