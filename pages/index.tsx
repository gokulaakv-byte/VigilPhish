import Head from 'next/head'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Anchor, Upload, X, AlertTriangle, CheckCircle, Link as LinkIcon, Clock, AlertCircle, Trash2, Share2 } from 'lucide-react'

type AnalysisResult = {
  score: number
  verdict: string
  reasons: string[]
  recommendation: string
  urlCheckResults?: Array<{ url: string; flagged: boolean }>
}

type UrlCheckResult = {
  urls: string[]
  flaggedUrls: Array<{ url: string; isFlagged: boolean }>
  totalChecked: number
  threatCount: number
}

type DomainAgeResult = {
  domains: string[]
  domainAges: Array<{ domain: string; createdDate: string | null; ageInDays: number | null; isSuspicious: boolean }>
  suspiciousDomains: Array<{ domain: string; createdDate: string | null; ageInDays: number | null; isSuspicious: boolean }>
}

type ScanHistoryItem = { date: string; verdict: string; score: number; preview: string }

const getVerdictPillColor = (verdict: string) => {
  if (verdict === 'Safe') return 'bg-green-900/40 text-green-300 border border-green-700/50'
  if (verdict === 'Suspicious') return 'bg-yellow-900/40 text-yellow-300 border border-yellow-700/50'
  return 'bg-red-900/40 text-red-300 border border-red-700/50'
}

const getScoreColor = (score: number) => {
  if (score <= 39) return 'text-green-500'
  if (score <= 69) return 'text-yellow-500'
  return 'text-red-500'
}

const getGaugeColor = (score: number) => {
  if (score <= 39) return '#22c55e'
  if (score <= 69) return '#eab308'
  return '#ef4444'
}

const formatDomainAge = (ageInDays: number | null): string => {
  if (ageInDays === null) return 'Unknown'
  if (ageInDays < 1) return 'Less than 1 day old'
  if (ageInDays === 1) return '1 day old'
  if (ageInDays < 30) return `${ageInDays} days old`
  if (ageInDays < 365) return `${Math.floor(ageInDays / 30)} months old`
  return `${Math.floor(ageInDays / 365)} years old`
}

export default function Home() {
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [urlCheckResult, setUrlCheckResult] = useState<UrlCheckResult | null>(null)
  const [domainAgeResult, setDomainAgeResult] = useState<DomainAgeResult | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([])
  const [copyConfirmation, setCopyConfirmation] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('phishwatch_scans')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setScanHistory(Array.isArray(parsed) ? parsed.slice(0, 5) : [])
      } catch { /* ignore */ }
    }
  }, [])

  const saveScanToHistory = (verdict: string, score: number, messageText: string) => {
    const preview = messageText.length > 60 ? messageText.substring(0, 60) + '...' : messageText
    const now = new Date()
    const dateStr = now.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })
    const newScan = { date: dateStr, verdict, score, preview }
    const updated = [newScan, ...scanHistory].slice(0, 5)
    setScanHistory(updated)
    localStorage.setItem('phishwatch_scans', JSON.stringify(updated))
  }

  const clearScanHistory = () => {
    setScanHistory([])
    localStorage.removeItem('phishwatch_scans')
  }

  const handleShareResult = async () => {
    if (!result) return
    const summary = `--- VigilPhish Report ---\nVerdict: ${result.verdict}\nRisk Score: ${result.score}/100\nRisk Signals:\n• ${result.reasons[0]}\n• ${result.reasons[1]}\n• ${result.reasons[2]}\nRecommendation: ${result.recommendation}\nAnalyzed by VigilPhish\n-------------------------`
    try {
      await navigator.clipboard.writeText(summary)
      setCopyConfirmation(true)
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current)
      copyTimeoutRef.current = setTimeout(() => setCopyConfirmation(false), 2000)
    } catch { /* ignore */ }
  }

  const handleAnalyze = async () => {
    if (!message.trim()) { setError('Please paste a message first.'); return }
    setError('')
    setLoading(true)
    setResult(null)
    setUrlCheckResult(null)
    setDomainAgeResult(null)

    try {
      const [analyzeRes, urlRes, domainRes] = await Promise.all([
        fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
        fetch('/api/check-urls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
        fetch('/api/check-domain-age', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) }),
      ])

      const [analyzeData, urlData, domainData] = await Promise.all([
        analyzeRes.json(), urlRes.json(), domainRes.json(),
      ])

      if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Analysis failed')

      setResult(analyzeData)
      if (urlRes.ok) setUrlCheckResult(urlData)
      if (domainRes.ok) setDomainAgeResult(domainData)
      saveScanToHistory(analyzeData.verdict, analyzeData.score, message)
    } catch (err: any) {
      setError(err.message || 'Failed to analyze message')
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image size must be less than 5MB'); return }
    if (!file.type.startsWith('image/')) { setError('Please upload an image file'); return }

    const reader = new FileReader()
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string
      const base64 = dataUrl.split(',')[1]
      setImagePreview(dataUrl)
      setError('')
      setExtracting(true)

      try {
        const res = await fetch('/api/extract-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64, mimeType: file.type }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Extraction failed')

        setMessage(data.extractedText)
        setExtracting(false)

        // Auto-analyze after extract
        setLoading(true)
        const txt = data.extractedText
        const [analyzeRes, urlRes, domainRes] = await Promise.all([
          fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt }) }),
          fetch('/api/check-urls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt }) }),
          fetch('/api/check-domain-age', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: txt }) }),
        ])
        const [analyzeData, urlData, domainData] = await Promise.all([analyzeRes.json(), urlRes.json(), domainRes.json()])
        if (!analyzeRes.ok) throw new Error(analyzeData.error || 'Analysis failed')
        setResult(analyzeData)
        if (urlRes.ok) setUrlCheckResult(urlData)
        if (domainRes.ok) setDomainAgeResult(domainData)
        saveScanToHistory(analyzeData.verdict, analyzeData.score, txt)
      } catch (err: any) {
        setError(err.message || 'Failed to process image')
      } finally {
        setLoading(false)
        setExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleReset = () => {
    setMessage(''); setResult(null); setError('')
    setUrlCheckResult(null); setDomainAgeResult(null); handleRemoveImage()
  }

  const renderReasons = (reasons: string[]) => {
    const safe = Array.isArray(reasons) ? reasons : []
    return [safe[0] || 'No risk signals detected', safe[1] || 'Analysis complete', safe[2] || 'Review recommended']
  }

  const createGaugeSVG = (score: number) => {
    const radius = 45
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (score / 100) * circumference
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="#334155" strokeWidth="8" />
        <circle cx="60" cy="60" r={radius} fill="none" stroke={getGaugeColor(score)} strokeWidth="8"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }} />
      </svg>
    )
  }

  return (
    <>
      <Head><title>VigilPhish — Phishing Detector</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white">

        {/* Header */}
        <div className="border-b border-slate-800">
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="flex items-center gap-3 mb-2">
              <Anchor className="w-8 h-8 text-blue-400" />
              <h1 className="text-4xl font-bold">VigilPhish</h1>
            </div>
            <p className="text-slate-400">Paste a suspicious message or upload a screenshot. Get an instant phishing risk score.</p>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto px-6 py-12">

          {/* Input Section */}
          <div className="mb-8 space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Paste your suspicious message</label>
              <textarea
                value={message}
                onChange={e => { setMessage(e.target.value); if (error) setError('') }}
                placeholder="Paste an email, text message, or any suspicious content here..."
                className="w-full h-48 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-lg resize-none p-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">Or upload a screenshot</label>
              <div className="border-2 border-dashed border-slate-700 rounded-lg p-6 text-center hover:border-slate-600 transition">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center gap-2 mx-auto hover:opacity-80 transition">
                  <Upload className="w-8 h-8 text-slate-400" />
                  <span className="text-slate-300">Click to upload or drag and drop</span>
                  <span className="text-xs text-slate-500">PNG, JPG, GIF up to 5MB</span>
                </button>
              </div>
              {imagePreview && (
                <div className="mt-4 relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imagePreview} alt="Uploaded screenshot" className="max-h-48 rounded-lg border border-slate-700" />
                  <button onClick={handleRemoveImage} className="absolute -top-2 -right-2 bg-red-600 hover:bg-red-700 rounded-full p-1 transition">
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          {/* Analyze Button */}
          <div className="mb-12">
            <button
              onClick={handleAnalyze}
              disabled={loading || extracting}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold px-8 py-2 rounded-lg flex items-center gap-2 transition"
            >
              {(loading || extracting) && <Loader2 className="w-4 h-4 animate-spin" />}
              {extracting ? 'Extracting text...' : loading ? 'Analyzing...' : 'Analyze'}
            </button>
          </div>

          {/* Results Section */}
          {result && (
            <div className="space-y-8 animate-fade-in">

              {/* Gauge + Verdict */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-32 h-32 flex items-center justify-center">
                    {createGaugeSVG(result.score)}
                    <div className="absolute flex flex-col items-center justify-center">
                      <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>{result.score}</div>
                      <div className="text-xs text-slate-400 mt-1">/ 100</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center space-y-6">
                  <div>
                    <div className={`text-4xl font-bold ${getScoreColor(result.score)} mb-4`}>{result.verdict}</div>
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Risk Signals</h3>
                      <ul className="space-y-2">
                        {renderReasons(result.reasons).map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <span className="text-blue-400 font-bold mt-1">•</span>
                            <span className="text-slate-300">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* URL Check (from analyze) */}
              {result.urlCheckResults !== undefined && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide mb-4">URL CHECK</h3>
                  {result.urlCheckResults.length === 0 ? (
                    <p className="text-slate-400">No URLs detected in this message.</p>
                  ) : result.urlCheckResults.some(u => u.flagged) ? (
                    <div className="space-y-3">
                      {result.urlCheckResults.filter(u => u.flagged).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-red-900/20 border border-red-700/50 rounded">
                          <span className="text-red-400 font-bold text-lg">⚠</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-red-300 break-all font-medium">{item.url}</p>
                            <p className="text-xs text-red-400 mt-1">Found in phishing database</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 text-green-300">
                      <span className="text-green-400 font-bold text-lg">✓</span>
                      <p className="text-sm">No URLs flagged in phishing database</p>
                    </div>
                  )}
                </div>
              )}

              {/* Domain Age */}
              {domainAgeResult && domainAgeResult.domains.length > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Clock className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Domain Age Analysis</h3>
                    {domainAgeResult.suspiciousDomains.length > 0 && (
                      <span className="ml-auto text-xs text-red-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />{domainAgeResult.suspiciousDomains.length} newly registered
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {domainAgeResult.domainAges.map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${item.isSuspicious ? 'bg-red-900/20 border border-red-700/50' : 'bg-green-900/20 border border-green-700/50'}`}>
                        {item.isSuspicious ? <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${item.isSuspicious ? 'text-red-300' : 'text-green-300'}`}>{item.domain}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {item.ageInDays !== null ? formatDomainAge(item.ageInDays) : 'WHOIS data unavailable'}
                            {item.createdDate && ` (registered ${new Date(item.createdDate).toLocaleDateString()})`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* URL Analysis Detail */}
              {urlCheckResult && urlCheckResult.totalChecked > 0 && (
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <LinkIcon className="w-5 h-5 text-blue-400" />
                    <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">URL Analysis</h3>
                    <span className="ml-auto text-xs text-slate-400">{urlCheckResult.threatCount} of {urlCheckResult.totalChecked} flagged</span>
                  </div>
                  <div className="space-y-2">
                    {urlCheckResult.flaggedUrls.map((item, idx) => (
                      <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg ${item.isFlagged ? 'bg-red-900/20 border border-red-700/50' : 'bg-green-900/20 border border-green-700/50'}`}>
                        {item.isFlagged ? <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" /> : <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm break-all ${item.isFlagged ? 'text-red-300' : 'text-green-300'}`}>{item.url}</p>
                          <p className="text-xs text-slate-400 mt-1">{item.isFlagged ? 'Flagged in OpenPhish feed' : 'Not found in threat feed'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="bg-gradient-to-r from-blue-900/30 to-blue-800/20 border border-blue-700/50 rounded-lg p-6">
                <h3 className="text-sm font-semibold text-blue-300 uppercase tracking-wide mb-2">Recommendation</h3>
                <p className="text-slate-200">{result.recommendation}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-4">
                <button onClick={handleReset} className="border border-slate-700 text-slate-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition text-sm">
                  Analyze Another Message
                </button>
                <button onClick={handleShareResult} className="border border-slate-700 text-slate-300 hover:bg-slate-800 px-4 py-2 rounded-lg transition text-sm flex items-center gap-2">
                  <Share2 className="w-4 h-4" /> Share Result
                </button>
                {copyConfirmation && <span className="text-green-400 text-sm font-medium">Copied to clipboard!</span>}
              </div>
            </div>
          )}

          {/* Scan History */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-400" /> Recent Scans
              </h2>
              {scanHistory.length > 0 && (
                <button onClick={clearScanHistory} className="text-slate-400 hover:text-red-400 text-sm flex items-center gap-1 transition">
                  <Trash2 className="w-4 h-4" /> Clear history
                </button>
              )}
            </div>
            {scanHistory.length === 0 ? (
              <p className="text-slate-500 text-sm">No scans yet. Paste a message above to get started.</p>
            ) : (
              <div className="space-y-3">
                {scanHistory.map((scan, idx) => (
                  <div key={idx} className="flex items-center gap-4 p-4 bg-slate-800/30 border border-slate-700 rounded-lg hover:bg-slate-800/50 transition-colors">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getVerdictPillColor(scan.verdict)}`}>{scan.verdict}</div>
                    <div className="text-sm font-semibold text-slate-300 min-w-fit">{scan.score}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm text-slate-400 truncate">{scan.preview}</p></div>
                    <div className="text-xs text-slate-500 whitespace-nowrap">{scan.date}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-16 pt-8 border-t border-slate-700 text-center text-slate-500 text-sm">
            <p>VigilPhish © 2026</p>
            <a href="/legal" className="text-blue-400 hover:text-blue-300 mt-3 inline-block">Terms & Privacy</a>
          </div>
        </div>
      </div>
    </>
  )
}
