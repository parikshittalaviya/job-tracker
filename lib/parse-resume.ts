import mammoth from 'mammoth'

export async function extractResumeText(
  buffer: ArrayBuffer,
  mimeType: string
): Promise<string> {
  if (mimeType === 'application/pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf')
    const pdf = await getDocumentProxy(new Uint8Array(buffer))
    const { text } = await extractText(pdf, { mergePages: true })
    return text
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) })
    return result.value
  }

  throw new Error(`Unsupported file type: ${mimeType}`)
}
