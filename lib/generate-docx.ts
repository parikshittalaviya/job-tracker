import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, TabStopType, TabStopPosition,
} from 'docx'
import type { TailoredResumeData } from './tailor-resume'

function sectionHeader(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 4 } },
    spacing: { before: 240, after: 80 },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    text,
    bullet: { level: 0 },
    spacing: { after: 40 },
  })
}

function twoColumn(left: string, right: string, leftBold = false): Paragraph {
  return new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
    children: [
      new TextRun({ text: left, bold: leftBold }),
      new TextRun({ text: `\t${right}`, color: '888888' }),
    ],
    spacing: { before: 120, after: 40 },
  })
}

export async function generateResumeDocx(resume: TailoredResumeData): Promise<Buffer> {
  const contactParts = [
    resume.contact.email,
    resume.contact.phone,
    resume.contact.location,
    resume.contact.linkedin,
    resume.contact.github,
    resume.contact.website,
  ].filter(Boolean)

  const children: Paragraph[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: resume.name, bold: true, size: 36 })],
      spacing: { after: 60 },
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: contactParts.join('  ·  '), size: 18, color: '555555' })],
      spacing: { after: 200 },
    }),
  ]

  if (resume.summary) {
    children.push(sectionHeader('SUMMARY'))
    children.push(new Paragraph({ text: resume.summary, spacing: { after: 80 } }))
  }

  if (resume.experience.length > 0) {
    children.push(sectionHeader('EXPERIENCE'))
    for (const exp of resume.experience) {
      children.push(twoColumn(`${exp.company}  ·  ${exp.title}`, exp.dates, true))
      if (exp.location) {
        children.push(new Paragraph({ children: [new TextRun({ text: exp.location, color: '666666', size: 18 })], spacing: { after: 40 } }))
      }
      exp.bullets.forEach((b) => children.push(bullet(b)))
    }
  }

  if (resume.education.length > 0) {
    children.push(sectionHeader('EDUCATION'))
    for (const edu of resume.education) {
      children.push(twoColumn(`${edu.institution}  ·  ${edu.degree}`, edu.dates, true))
      if (edu.gpa) {
        children.push(new Paragraph({ children: [new TextRun({ text: `GPA: ${edu.gpa}`, color: '666666', size: 18 })], spacing: { after: 40 } }))
      }
      edu.details?.forEach((d) => children.push(bullet(d)))
    }
  }

  if (resume.projects && resume.projects.length > 0) {
    children.push(sectionHeader('PROJECTS'))
    for (const proj of resume.projects) {
      children.push(new Paragraph({
        children: [
          new TextRun({ text: proj.name, bold: true }),
          new TextRun({ text: `  —  ${proj.description}` }),
        ],
        spacing: { before: 120, after: 40 },
      }))
      if (proj.tech && proj.tech.length > 0) {
        children.push(new Paragraph({ children: [new TextRun({ text: proj.tech.join(', '), color: '666666', size: 18 })], spacing: { after: 80 } }))
      }
    }
  }

  if (resume.skills.length > 0) {
    children.push(sectionHeader('SKILLS'))
    children.push(new Paragraph({ text: resume.skills.join('  ·  '), spacing: { after: 80 } }))
  }

  if (resume.certifications && resume.certifications.length > 0) {
    children.push(sectionHeader('CERTIFICATIONS'))
    resume.certifications.forEach((c) => children.push(bullet(c)))
  }

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } },
      },
      paragraphStyles: [
        {
          id: 'Heading2', name: 'Heading 2',
          run: { bold: true, size: 22, color: '111111' },
          paragraph: { spacing: { before: 240, after: 80 } },
        },
      ],
    },
    sections: [{ children }],
  })

  return Packer.toBuffer(doc)
}

export async function generateCoverLetterDocx(
  candidateName: string,
  content: string
): Promise<Buffer> {
  const paragraphs = content.split('\n').filter((p) => p.trim())

  const doc = new Document({
    styles: {
      default: { document: { run: { font: 'Calibri', size: 22 } } },
    },
    sections: [{
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: candidateName, bold: true, size: 36 })],
          spacing: { after: 480 },
        }),
        ...paragraphs.map((p) =>
          new Paragraph({ text: p, spacing: { after: 240 } })
        ),
      ],
    }],
  })

  return Packer.toBuffer(doc)
}
