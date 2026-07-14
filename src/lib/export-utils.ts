import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface ExportableClient {
  id: string
  name: string
  email: string
  phone: string
  company: string
  address: string
  notes: string
  createdAt: string
  updatedAt: string
}

export interface ExportColumn<T> {
  header: string
  value: (row: T) => string | number
}

const clientExportColumns: ExportColumn<ExportableClient>[] = [
  { header: 'Name', value: (row) => row.name },
  { header: 'Email', value: (row) => row.email },
  { header: 'Phone', value: (row) => row.phone || '' },
  { header: 'Company', value: (row) => row.company },
  { header: 'Address', value: (row) => row.address || '' },
  { header: 'Notes', value: (row) => row.notes || '' },
  { header: 'Created', value: (row) => new Date(row.createdAt).toLocaleDateString() },
  { header: 'Last Updated', value: (row) => new Date(row.updatedAt).toLocaleDateString() },
]

export function exportTableToExcel<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName = 'Report'
) {
  const excelData = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.header, column.value(row)]))
  )

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)
  worksheet['!cols'] = columns.map((column) => ({ wch: Math.max(column.header.length + 2, 16) }))
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export function exportTableToPDF<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title = 'Report'
) {
  const doc = new jsPDF(rows.length > 0 && columns.length > 5 ? 'l' : 'p', 'mm', 'a4')

  doc.setFontSize(16)
  doc.text(title, 14, 22)

  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

  autoTable(doc, {
    head: [columns.map((column) => column.header)],
    body: rows.map((row) => columns.map((column) => String(column.value(row)))),
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(
      `Page ${i} of ${pageCount}`,
      doc.internal.pageSize.width - 30,
      doc.internal.pageSize.height - 10
    )
  }

  doc.save(`${filename}.pdf`)
}

export const exportToExcel = (clients: ExportableClient[], filename: string = 'clients') => {
  exportTableToExcel(clients, clientExportColumns, filename, 'Clients')
}

export const exportToPDF = (clients: ExportableClient[], filename: string = 'clients') => {
  exportTableToPDF(clients, clientExportColumns, filename, 'Client List Report')
}

export const getExportFilename = (filterType?: string, searchTerm?: string) => {
  const timestamp = new Date().toISOString().split('T')[0]
  let filename = `clients_${timestamp}`

  if (filterType && filterType !== 'all') {
    filename += `_${filterType}`
  }

  if (searchTerm && searchTerm.trim()) {
    const cleanSearch = searchTerm.trim().replace(/[^a-zA-Z0-9]/g, '_')
    filename += `_${cleanSearch.substring(0, 20)}`
  }

  return filename
}
