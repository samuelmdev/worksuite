import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

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

export const exportToExcel = (clients: ExportableClient[], filename: string = 'clients') => {
  // Prepare data for Excel
  const excelData = clients.map(client => ({
    'Name': client.name,
    'Email': client.email,
    'Phone': client.phone || '',
    'Company': client.company,
    'Address': client.address || '',
    'Notes': client.notes || '',
    'Created Date': new Date(client.createdAt).toLocaleDateString(),
    'Last Updated': new Date(client.updatedAt).toLocaleDateString()
  }))

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(excelData)

  // Set column widths
  const columnWidths = [
    { wch: 20 }, // Name
    { wch: 30 }, // Email
    { wch: 18 }, // Phone
    { wch: 25 }, // Company
    { wch: 40 }, // Address
    { wch: 50 }, // Notes
    { wch: 12 }, // Created Date
    { wch: 12 }  // Last Updated
  ]
  worksheet['!cols'] = columnWidths

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Clients')

  // Generate and download file
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}

export const exportToPDF = (clients: ExportableClient[], filename: string = 'clients') => {
  const doc = new jsPDF('l', 'mm', 'a4') // Landscape orientation for better table fit

  // Add title
  doc.setFontSize(16)
  doc.text('Client List Report', 14, 22)

  // Add export date
  doc.setFontSize(10)
  doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30)

  // Prepare data for PDF table
  const tableData = clients.map(client => [
    client.name,
    client.email,
    client.phone || '',
    client.company,
    client.address || '',
    client.notes || '',
    new Date(client.createdAt).toLocaleDateString()
  ])

  // Create table
  doc.autoTable({
    head: [['Name', 'Email', 'Phone', 'Company', 'Address', 'Notes', 'Created']],
    body: tableData,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [71, 85, 105], // slate-600
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252] // slate-50
    },
    columnStyles: {
      0: { cellWidth: 25 }, // Name
      1: { cellWidth: 35 }, // Email
      2: { cellWidth: 20 }, // Phone
      3: { cellWidth: 30 }, // Company
      4: { cellWidth: 40 }, // Address
      5: { cellWidth: 50 }, // Notes
      6: { cellWidth: 20 }  // Created
    },
    margin: { left: 14, right: 14 }
  })

  // Add footer with page numbers
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10)
  }

  // Save the PDF
  doc.save(`${filename}.pdf`)
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
