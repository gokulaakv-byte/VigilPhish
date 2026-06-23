import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imageBase64, mimeType = 'image/jpeg' } = req.body
  if (!imageBase64) return res.status(400).json({ error: 'Image is required' })

  try {
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const safeMimeType = validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg'

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1000,
      system: 'You are a text extraction expert. Extract all visible text from the provided image of a suspicious message or email. Return only the extracted text, nothing else. If no text is visible, return "No text found in image".',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: safeMimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: imageBase64,
            },
          },
          { type: 'text', text: 'Extract all text from this image.' },
        ],
      }],
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response')
    if (content.text.includes('No text found')) {
      return res.status(400).json({ error: 'No text found in the image. Please upload a screenshot with visible text.' })
    }

    return res.status(200).json({ extractedText: content.text })
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Image extraction failed' })
  }
}
