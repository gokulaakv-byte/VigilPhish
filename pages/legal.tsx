import Head from 'next/head'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function Legal() {
  return (
    <>
      <Head><title>Legal — VigilPhish</title></Head>
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950">
        <div className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-4xl mx-auto px-4 py-6">
            <Link href="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 mb-4 transition">
              <ArrowLeft className="w-4 h-4" /> Back to VigilPhish
            </Link>
            <h1 className="text-3xl font-bold text-slate-100">Legal</h1>
            <p className="text-slate-400 mt-2">Terms of Use and Privacy Policy</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-12">
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded"></div>Terms of Use
            </h2>
            <div className="space-y-6 text-slate-300">
              {[
                { title: 'Informational Purpose Only', text: 'VigilPhish is provided for informational purposes only. The service does not guarantee the accuracy, completeness, or reliability of any analysis results. Phishing detection is complex and no automated system can detect all threats with 100% accuracy.' },
                { title: 'Prohibited Content', text: 'Do not submit messages containing personal passwords, credit card numbers, social security numbers, or other sensitive financial information. VigilPhish is not designed to securely handle such data, and submitting it may expose you to additional risk.' },
                { title: 'AI-Generated Results', text: 'Results provided by VigilPhish are AI-generated and should not be treated as professional security advice. For critical security decisions, consult with a qualified security professional or your organization\'s IT department.' },
                { title: 'No Warranty', text: 'VigilPhish is provided free of charge with no warranty of any kind, express or implied. We are not liable for any damages, losses, or consequences resulting from the use or misuse of this service.' },
              ].map(({ title, text }) => (
                <div key={title} className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-slate-100 mb-6 flex items-center gap-2">
              <div className="w-1 h-8 bg-blue-500 rounded"></div>Privacy Policy
            </h2>
            <div className="space-y-6 text-slate-300">
              {[
                { title: 'No Message Storage', text: 'We do not store any messages submitted to VigilPhish for analysis. All submissions are processed in real time and discarded immediately after analysis is complete. No copies of your messages are retained on our servers.' },
                { title: 'No Personal Information Collection', text: 'VigilPhish does not require user accounts, registration, or login. We do not collect personal information such as names, email addresses, IP addresses, or browsing history. The service is completely anonymous.' },
                { title: 'Real-Time Processing', text: 'Analysis is processed in real time using AI models. Once the analysis is complete and the results are displayed to you, the message is immediately discarded and not retained in any form.' },
                { title: 'Third-Party API Usage', text: 'VigilPhish uses the Anthropic Claude API to process text for analysis. When you submit a message, it is sent to Anthropic\'s servers for processing. Please refer to Anthropic\'s Privacy Policy for information about how they handle your data.' },
                { title: 'Cookies', text: 'VigilPhish uses no cookies except those required for basic site functionality. We do not use tracking cookies, analytics cookies, or advertising cookies. Your browsing data is not tracked or sold.' },
              ].map(({ title, text }) => (
                <div key={title} className="bg-slate-800/30 border border-slate-700 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-slate-100 mb-3">{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-16 pt-8 border-t border-slate-700 text-center text-slate-500 text-sm">
            <p>Last updated: June 2026</p>
            <Link href="/" className="text-blue-400 hover:text-blue-300 mt-4 inline-block">Back to VigilPhish</Link>
          </div>
        </div>
      </div>
    </>
  )
}
