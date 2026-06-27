// eslint-disable-next-line @typescript-eslint/no-require-imports
const PdfPrinter = require('pdfmake/js/Printer').default as new (
  fonts: Record<string, { normal: Buffer; bold?: Buffer; italics?: Buffer; bolditalics?: Buffer }>
) => { createPdfKitDocument: (def: unknown) => { on: (e: string, cb: (d: Buffer) => void) => void; end: () => void } }

import { readFileSync } from 'fs'
import { join } from 'path'
import type { TDocumentDefinitions, Content } from 'pdfmake/interfaces'
import type { TailoredResumeData } from './tailor-resume'

function getFonts() {
  const base = join(process.cwd(), 'node_modules', 'pdfmake', 'fonts', 'Roboto')
  return {
    Roboto: {
      normal: readFileSync(join(base, 'Roboto-Regular.ttf')),
      bold: readFileSync(join(base, 'Roboto-Medium.ttf')),
      italics: readFileSync(join(base, 'Roboto-Italic.ttf')),
      bolditalics: readFileSync(join(base, 'Roboto-MediumItalic.ttf')),
    },
  }
}

function divider(): Content {
  return { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#cccccc' }], margin: [0, 2, 0, 4] }
}

function section(title: string): Content {
  return {
    stack: [
      { text: title, style: 'sectionHeader', margin: [0, 12, 0, 2] },
      divider(),
    ],
  }
}

export async function generateResumePdf(resume: TailoredResumeData): Promise<Buffer> {
  const printer = new PdfPrinter(getFonts())
  const content: Content[] = []

  // Header
  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedin,
    resume.contact.github,
    resume.contact.website,
  ].filter(Boolean)

  content.push({ text: resume.name, style: 'name' })
  content.push({ text: contactParts.join('  ·  '), style: 'contact', margin: [0, 2, 0, 0] })

  // Summary
  if (resume.summary) {
    content.push(section('SUMMARY'))
    content.push({ text: resume.summary, style: 'body' })
  }

  // Experience
  if (resume.experience.length > 0) {
    content.push(section('EXPERIENCE'))
    for (const exp of resume.experience) {
      content.push({
        columns: [
          { text: [{ text: exp.company, bold: true }, { text: `  ·  ${exp.title}` }], style: 'body', width: '*' },
          { text: exp.dates, style: 'subtle', alignment: 'right', width: 'auto' },
        ],
        margin: [0, 6, 0, 0],
      })
      if (exp.location) {
        content.push({ text: exp.location, style: 'subtle', margin: [0, 1, 0, 2] })
      }
      if (exp.bullets.length > 0) {
        content.push({ ul: exp.bullets, style: 'body', margin: [6, 2, 0, 4] })
      }
    }
  }

  // Education
  if (resume.education.length > 0) {
    content.push(section('EDUCATION'))
    for (const edu of resume.education) {
      content.push({
        columns: [
          { text: [{ text: edu.institution, bold: true }, { text: `  ·  ${edu.degree}` }], style: 'body', width: '*' },
          { text: edu.dates, style: 'subtle', alignment: 'right', width: 'auto' },
        ],
        margin: [0, 6, 0, 0],
      })
      if (edu.gpa) content.push({ text: `GPA: ${edu.gpa}`, style: 'subtle', margin: [0, 1, 0, 0] })
      if (edu.details && edu.details.length > 0) {
        content.push({ ul: edu.details, style: 'body', margin: [6, 2, 0, 4] })
      }
    }
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    content.push(section('PROJECTS'))
    for (const proj of resume.projects) {
      content.push({
        text: [{ text: proj.name, bold: true }, { text: `  —  ${proj.description}` }],
        style: 'body',
        margin: [0, 6, 0, 0],
      })
      if (proj.tech && proj.tech.length > 0) {
        content.push({ text: proj.tech.join(', '), style: 'subtle', margin: [0, 1, 0, 4] })
      }
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    content.push(section('SKILLS'))
    content.push({ text: resume.skills.join('  ·  '), style: 'body', margin: [0, 4, 0, 0] })
  }

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    content.push(section('CERTIFICATIONS'))
    content.push({ ul: resume.certifications, style: 'body', margin: [6, 4, 0, 0] })
  }

  const docDef: TDocumentDefinitions = {
    content,
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3 },
    styles: {
      name: { fontSize: 22, bold: true, alignment: 'center', color: '#111111' },
      contact: { fontSize: 9, color: '#555555', alignment: 'center' },
      sectionHeader: { fontSize: 11, bold: true, color: '#111111', characterSpacing: 0.5 },
      body: { fontSize: 10, color: '#222222' },
      subtle: { fontSize: 9, color: '#666666' },
    },
    pageMargins: [45, 40, 45, 40],
  }

  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDef)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

export async function generateCoverLetterPdf(
  candidateName: string,
  content: string
): Promise<Buffer> {
  const printer = new PdfPrinter(getFonts())

  const paragraphs = content.split('\n').filter((p) => p.trim())

  const docDef: TDocumentDefinitions = {
    content: [
      { text: candidateName, style: 'name', margin: [0, 0, 0, 24] },
      ...paragraphs.map((p) => ({ text: p, style: 'body', margin: [0, 0, 0, 12] } as Content)),
    ],
    defaultStyle: { font: 'Roboto', fontSize: 11, lineHeight: 1.5 },
    styles: {
      name: { fontSize: 18, bold: true, alignment: 'center', color: '#111111' },
      body: { fontSize: 11, color: '#222222' },
    },
    pageMargins: [72, 72, 72, 72],
  }

  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDef)
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}
