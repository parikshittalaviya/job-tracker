import * as cheerio from 'cheerio'

export async function fetchJobDescription(url: string): Promise<{ text: string | null; error: string | null }> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    })

    if (!res.ok) {
      return { text: null, error: `HTTP ${res.status}` }
    }

    const html = await res.text()
    const $ = cheerio.load(html)

    // Remove noise elements
    $('script, style, nav, header, footer, [role="banner"], [role="navigation"], [aria-hidden="true"]').remove()

    // Try known job board selectors first
    const selectors = [
      '[data-testid="jobDescriptionText"]', // Indeed
      '.jobs-description__content',          // LinkedIn
      '.job-description',
      '#job-description',
      '[class*="jobDescription"]',
      '[class*="job-description"]',
      'article',
      'main',
    ]

    for (const sel of selectors) {
      const el = $(sel).first()
      if (el.length) {
        const text = el.text().replace(/\s+/g, ' ').trim()
        if (text.length > 200) return { text, error: null }
      }
    }

    // Fallback: body text
    const text = $('body').text().replace(/\s+/g, ' ').trim()
    if (text.length > 200) return { text: text.slice(0, 8000), error: null }

    return { text: null, error: 'Could not extract meaningful content from page' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { text: null, error: message }
  }
}
