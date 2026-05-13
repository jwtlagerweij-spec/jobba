export async function downloadAsPDF(content: string, filename: string) {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)

  const margin = 20
  const pageWidth = doc.internal.pageSize.getWidth()
  const maxWidth = pageWidth - margin * 2
  const lineHeight = 6
  let y = margin

  const paragraphs = content.split('\n')
  for (const para of paragraphs) {
    if (para.trim() === '') {
      y += lineHeight * 0.5
      continue
    }
    const lines = doc.splitTextToSize(para, maxWidth)
    for (const line of lines) {
      if (y > doc.internal.pageSize.getHeight() - margin) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += lineHeight
    }
    y += lineHeight * 0.3
  }

  doc.save(`${filename}.pdf`)
}

export async function downloadAsWord(content: string, filename: string) {
  const { Document, Paragraph, TextRun, Packer, AlignmentType } = await import('docx')
  const { saveAs } = await import('file-saver')

  const children = content.split('\n').map(line =>
    new Paragraph({
      children: [new TextRun({ text: line, size: 22, font: 'Calibri' })],
      alignment: AlignmentType.LEFT,
      spacing: { after: line.trim() === '' ? 0 : 120 },
    })
  )

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${filename}.docx`)
}
