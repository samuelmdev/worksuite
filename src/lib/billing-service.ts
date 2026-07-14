import { TimeService } from './time-service-multi-org'
import { ProjectsService } from './projects-service-multi-org'
import { ClientService } from './client-service-multi-org'

export interface InvoiceLineItem {
  id: string
  description: string
  quantity: number
  unit: 'hours' | 'fixed'
  rate: number
  amount: number
  source_type: 'time_entry' | 'project'
  source_id?: string
}

export interface Invoice {
  id: string
  organization_id: string
  client_id: string
  client_name: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  notes?: string
  created_at: string
}

export interface InvoiceFormData {
  client_id: string
  issue_date: string
  due_date: string
  tax_rate: number
  notes?: string
  include_time_entries: boolean
  include_projects: boolean
  start_date: string
  end_date: string
}

export interface BillingStats {
  total_invoices: number
  draft_invoices: number
  paid_invoices: number
  total_revenue: number
  outstanding_amount: number
  unbilled_hours: number
}

const STORAGE_KEY = 'worksuite_invoices'

function loadInvoices(): Invoice[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveInvoices(invoices: Invoice[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices))
}

function generateId(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

function generateInvoiceNumber(orgId: string): string {
  const existing = loadInvoices().filter(i => i.organization_id === orgId)
  const num = existing.length + 1
  const year = new Date().getFullYear()
  return `INV-${year}-${String(num).padStart(4, '0')}`
}

export class BillingService {
  static getInvoices(organizationId: string): Invoice[] {
    return loadInvoices()
      .filter(i => i.organization_id === organizationId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }

  static getInvoice(id: string, organizationId: string): Invoice | null {
    return loadInvoices().find(i => i.id === id && i.organization_id === organizationId) ?? null
  }

  static getStats(organizationId: string): BillingStats {
    const invoices = this.getInvoices(organizationId)
    const paid = invoices.filter(i => i.status === 'paid')
    const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')

    return {
      total_invoices: invoices.length,
      draft_invoices: invoices.filter(i => i.status === 'draft').length,
      paid_invoices: paid.length,
      total_revenue: paid.reduce((sum, i) => sum + i.total, 0),
      outstanding_amount: outstanding.reduce((sum, i) => sum + i.total, 0),
      unbilled_hours: 0,
    }
  }

  static async getUnbilledHours(organizationId: string): Promise<number> {
    const entries = await TimeService.getTimeEntries(
      { status: 'approved', billable: true },
      organizationId
    )
    const invoicedEntryIds = new Set<string>()
    for (const invoice of this.getInvoices(organizationId)) {
      for (const item of invoice.line_items) {
        if (item.source_type === 'time_entry' && item.source_id) {
          invoicedEntryIds.add(item.source_id)
        }
      }
    }
    return entries
      .filter(e => !invoicedEntryIds.has(e.id))
      .reduce((sum, e) => sum + (e.billable_hours ?? 0), 0)
  }

  static async buildLineItems(
    organizationId: string,
    formData: InvoiceFormData
  ): Promise<InvoiceLineItem[]> {
    const items: InvoiceLineItem[] = []
    const invoicedEntryIds = new Set<string>()
    const invoicedProjectIds = new Set<string>()

    for (const invoice of this.getInvoices(organizationId)) {
      for (const item of invoice.line_items) {
        if (item.source_type === 'time_entry' && item.source_id) invoicedEntryIds.add(item.source_id)
        if (item.source_type === 'project' && item.source_id) invoicedProjectIds.add(item.source_id)
      }
    }

    if (formData.include_time_entries) {
      const entries = await TimeService.getTimeEntries(
        {
          status: 'approved',
          billable: true,
          client_id: formData.client_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
        },
        organizationId
      )

      for (const entry of entries) {
        if (invoicedEntryIds.has(entry.id)) continue
        const hours = entry.billable_hours ?? 0
        if (hours <= 0) continue
        const rate = entry.hourly_rate ?? 0
        items.push({
          id: generateId(),
          description: entry.description || entry.project_name || 'Time entry',
          quantity: hours,
          unit: 'hours',
          rate,
          amount: hours * rate,
          source_type: 'time_entry',
          source_id: entry.id,
        })
      }
    }

    if (formData.include_projects) {
      const projects = await ProjectsService.getProjects(organizationId)
      const clientProjects = projects.filter(p => {
        if (invoicedProjectIds.has(p.id)) return false
        return p.status === 'active' || p.status === 'completed'
      })

      for (const project of clientProjects) {
        const budget = project.budget ?? 0
        const rate = project.hourly_rate ?? 0
        const hours = project.total_hours ?? 0

        if (budget > 0) {
          items.push({
            id: generateId(),
            description: `Project: ${project.name}`,
            quantity: 1,
            unit: 'fixed',
            rate: budget,
            amount: budget,
            source_type: 'project',
            source_id: project.id,
          })
        } else if (hours > 0 && rate > 0) {
          items.push({
            id: generateId(),
            description: `Project hours: ${project.name}`,
            quantity: hours,
            unit: 'hours',
            rate,
            amount: hours * rate,
            source_type: 'project',
            source_id: project.id,
          })
        }
      }
    }

    return items
  }

  static async createInvoice(
    organizationId: string,
    formData: InvoiceFormData
  ): Promise<Invoice> {
    const client = await ClientService.getClient(formData.client_id, organizationId)
    if (!client) throw new Error('Client not found')

    const lineItems = await this.buildLineItems(organizationId, formData)
    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = subtotal * (formData.tax_rate / 100)
    const total = subtotal + taxAmount

    const invoice: Invoice = {
      id: generateId(),
      organization_id: organizationId,
      client_id: formData.client_id,
      client_name: client.name,
      invoice_number: generateInvoiceNumber(organizationId),
      issue_date: formData.issue_date,
      due_date: formData.due_date,
      status: 'draft',
      line_items: lineItems,
      subtotal,
      tax_rate: formData.tax_rate,
      tax_amount: taxAmount,
      total,
      notes: formData.notes,
      created_at: new Date().toISOString(),
    }

    const invoices = loadInvoices()
    invoices.push(invoice)
    saveInvoices(invoices)
    return invoice
  }

  static updateInvoiceStatus(
    id: string,
    organizationId: string,
    status: Invoice['status']
  ): Invoice | null {
    const invoices = loadInvoices()
    const index = invoices.findIndex(i => i.id === id && i.organization_id === organizationId)
    if (index === -1) return null
    invoices[index] = { ...invoices[index], status }
    saveInvoices(invoices)
    return invoices[index]
  }

  static deleteInvoice(id: string, organizationId: string): boolean {
    const invoices = loadInvoices()
    const filtered = invoices.filter(i => !(i.id === id && i.organization_id === organizationId))
    if (filtered.length === invoices.length) return false
    saveInvoices(filtered)
    return true
  }

  static exportInvoiceCsv(invoice: Invoice): string {
    const header = 'Description,Quantity,Unit,Rate,Amount'
    const rows = invoice.line_items.map(
      item => `"${item.description}",${item.quantity},${item.unit},${item.rate},${item.amount}`
    )
    return [header, ...rows, '', `Subtotal,,,${invoice.subtotal}`, `Tax (${invoice.tax_rate}%),,,${invoice.tax_amount}`, `Total,,,${invoice.total}`].join('\n')
  }
}
