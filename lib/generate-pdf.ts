import PDFDocument from 'pdfkit'
import type { TailoredResumeData } from './tailor-resume'

const MARGIN = 45
const PAGE_WIDTH = 612
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const ACCENT = '#1a1a1a'
const SUBTLE = '#666666'

function collectBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    doc.end()
  })
}

function drawSectionHeader(doc: PDFKit.PDFDocument, title: string) {
  doc.moveDown(0.6)
  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor(ACCENT)
    .text(title, MARGIN, doc.y)
  const y = doc.y + 2
  doc
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y)
    .strokeColor('#cccccc')
    .lineWidth(0.5)
    .stroke()
  doc.moveDown(0.3)
}

function drawTwoColumn(doc: PDFKit.PDFDocument, left: string, right: string, leftBold = false) {
  const rightWidth = 120
  const leftWidth = CONTENT_WIDTH - rightWidth
  const y = doc.y

  doc
    .font(leftBold ? 'Helvetica-Bold' : 'Helvetica')
    .fontSize(10)
    .fillColor(ACCENT)
    .text(left, MARGIN, y, { width: leftWidth, lineBreak: false })

  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(SUBTLE)
    .text(right, MARGIN + leftWidth, y, { width: rightWidth, align: 'right', lineBreak: false })

  doc.moveDown(0.2)
}

export async function generateResumePdf(resume: TailoredResumeData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: MARGIN, size: 'LETTER', bufferPages: true })

  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedin,
    resume.contact.github,
    resume.contact.website,
  ].filter(Boolean)

  // Name
  doc
    .font('Helvetica-Bold')
    .fontSize(22)
    .fillColor(ACCENT)
    .text(resume.name, MARGIN, MARGIN, { align: 'center', width: CONTENT_WIDTH })

  // Contact line
  doc
    .font('Helvetica')
    .fontSize(9)
    .fillColor(SUBTLE)
    .text(contactParts.join('  ·  '), MARGIN, doc.y + 2, { align: 'center', width: CONTENT_WIDTH })

  // Summary
  if (resume.summary) {
    drawSectionHeader(doc, 'SUMMARY')
    doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text(resume.summary, MARGIN, doc.y, { width: CONTENT_WIDTH })
  }

  // Experience
  if (resume.experience.length > 0) {
    drawSectionHeader(doc, 'EXPERIENCE')
    for (const exp of resume.experience) {
      drawTwoColumn(doc, `${exp.company}  ·  ${exp.title}`, exp.dates, true)
      if (exp.location) {
        doc.font('Helvetica').fontSize(9).fillColor(SUBTLE).text(exp.location, MARGIN, doc.y, { width: CONTENT_WIDTH })
        doc.moveDown(0.1)
      }
      for (const bullet of exp.bullets) {
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor(ACCENT)
          .text(`• ${bullet}`, MARGIN + 8, doc.y, { width: CONTENT_WIDTH - 8 })
      }
      doc.moveDown(0.3)
    }
  }

  // Education
  if (resume.education.length > 0) {
    drawSectionHeader(doc, 'EDUCATION')
    for (const edu of resume.education) {
      drawTwoColumn(doc, `${edu.institution}  ·  ${edu.degree}`, edu.dates, true)
      if (edu.gpa) {
        doc.font('Helvetica').fontSize(9).fillColor(SUBTLE).text(`GPA: ${edu.gpa}`, MARGIN, doc.y, { width: CONTENT_WIDTH })
      }
      for (const d of edu.details ?? []) {
        doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text(`• ${d}`, MARGIN + 8, doc.y, { width: CONTENT_WIDTH - 8 })
      }
      doc.moveDown(0.3)
    }
  }

  // Projects
  if (resume.projects && resume.projects.length > 0) {
    drawSectionHeader(doc, 'PROJECTS')
    for (const proj of resume.projects) {
      doc
        .font('Helvetica-Bold').fontSize(10).fillColor(ACCENT)
        .text(proj.name, MARGIN, doc.y, { continued: true, width: CONTENT_WIDTH })
        .font('Helvetica')
        .text(`  —  ${proj.description}`)
      if (proj.tech && proj.tech.length > 0) {
        doc.font('Helvetica').fontSize(9).fillColor(SUBTLE).text(proj.tech.join(', '), MARGIN, doc.y, { width: CONTENT_WIDTH })
      }
      doc.moveDown(0.3)
    }
  }

  // Skills
  if (resume.skills.length > 0) {
    drawSectionHeader(doc, 'SKILLS')
    doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text(resume.skills.join('  ·  '), MARGIN, doc.y, { width: CONTENT_WIDTH })
  }

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    drawSectionHeader(doc, 'CERTIFICATIONS')
    for (const cert of resume.certifications) {
      doc.font('Helvetica').fontSize(10).fillColor(ACCENT).text(`• ${cert}`, MARGIN + 8, doc.y, { width: CONTENT_WIDTH - 8 })
    }
  }

  return collectBuffer(doc)
}

export async function generateCoverLetterPdf(
  candidateName: string,
  content: string
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 72, size: 'LETTER' })

  doc
    .font('Helvetica-Bold')
    .fontSize(18)
    .fillColor(ACCENT)
    .text(candidateName, { align: 'center' })

  doc.moveDown(2)

  const paragraphs = content.split('\n').filter((p) => p.trim())
  for (const para of paragraphs) {
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor(ACCENT)
      .text(para, { lineGap: 3 })
    doc.moveDown(0.8)
  }

  return collectBuffer(doc)
}
