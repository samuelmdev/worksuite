import { supabase } from './supabase'
import { TimeService } from './time-service-multi-org'
import { ProjectsService } from './projects-service-multi-org'
import { ClientService } from './client-service-multi-org'
import { FinanceService } from './finance-service'

export interface InvoiceLineItem {
  id: string
  invoice_id?: string
  description: string
  quantity: number
  unit: 'hours' | 'fixed'
  rate: number
  amount: number
  source_type: 'time_entry' | 'project' | 'manual'
  source_id?: string | null
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export interface Invoice {
  id: string
  organization_id: string
  client_id: string
  client_name: string
  invoice_number: string
  issue_date: string
  due_date: string
  status: InvoiceStatus
  line_items: InvoiceLineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  currency: string
  notes?: string | null
  paid_at?: string | null
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

type InvoiceRow = Omit<Invoice, 'line_items' | 'client_name'> & {
  clients?: { name: string } | null
  invoice_line_items?: InvoiceLineItem[] | null
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    ...row,
    client_name: row.clients?.name ?? 'Unknown client',
    line_items: row.invoice_line_items ?? [],
  }
}

const INVOICE_SELECT = `
  *,
  clients:client_id(name),
  invoice_line_items(*)
`

export class BillingService {
  static async getInvoices(organizationId: string): Promise<Invoice[]> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invoices:', error)
      throw new Error('Failed to fetch invoices')
    }
    return ((data as unknown as InvoiceRow[]) || []).map(mapInvoice)
  }

  static async getInvoice(id: string, organizationId: string): Promise<Invoice | null> {
    const { data, error } = await supabase
      .from('invoices')
      .select(INVOICE_SELECT)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (error) {
      console.error('Error fetching invoice:', error)
      throw new Error('Failed to fetch invoice')
    }
    return data ? mapInvoice(data as unknown as InvoiceRow) : null
  }

  static async getStats(organizationId: string): Promise<BillingStats> {
    const [invoices, unbilledHours] = await Promise.all([
      this.getInvoices(organizationId),
      this.getUnbilledHours(organizationId),
    ])

    const paid = invoices.filter(i => i.status === 'paid')
    const outstanding = invoices.filter(i => i.status === 'sent' || i.status === 'overdue')

    return {
      total_invoices: invoices.length,
      draft_invoices: invoices.filter(i => i.status === 'draft').length,
      paid_invoices: paid.length,
      total_revenue: paid.reduce((sum, i) => sum + i.total, 0),
      outstanding_amount: outstanding.reduce((sum, i) => sum + i.total, 0),
      unbilled_hours: unbilledHours,
    }
  }

  /** Ids already billed, so the same work is never invoiced twice. */
  private static async getInvoicedSourceIds(
    organizationId: string
  ): Promise<{ timeEntries: Set<string>; projects: Set<string> }> {
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('source_type, source_id, invoices!inner(organization_id, status)')
      .eq('invoices.organization_id', organizationId)
      .neq('invoices.status', 'cancelled')

    if (error) {
      console.error('Error fetching invoiced sources:', error)
      throw new Error('Failed to check invoiced work')
    }

    const timeEntries = new Set<string>()
    const projects = new Set<string>()

    for (const row of ((data as any[]) || [])) {
      if (!row.source_id) continue
      if (row.source_type === 'time_entry') timeEntries.add(row.source_id)
      if (row.source_type === 'project') projects.add(row.source_id)
    }

    return { timeEntries, projects }
  }

  static async getUnbilledHours(organizationId: string): Promise<number> {
    const [entries, invoiced] = await Promise.all([
      TimeService.getTimeEntries({ status: 'approved', billable: true }, organizationId),
      this.getInvoicedSourceIds(organizationId),
    ])

    return entries
      .filter(e => !invoiced.timeEntries.has(e.id))
      .reduce((sum, e) => sum + (e.billable_hours ?? 0), 0)
  }

  static async buildLineItems(
    organizationId: string,
    formData: InvoiceFormData
  ): Promise<InvoiceLineItem[]> {
    const items: InvoiceLineItem[] = []
    const invoiced = await this.getInvoicedSourceIds(organizationId)

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
        if (invoiced.timeEntries.has(entry.id)) continue
        const hours = entry.billable_hours ?? 0
        if (hours <= 0) continue
        const rate = entry.hourly_rate ?? 0
        items.push({
          id: crypto.randomUUID(),
          description: entry.description || entry.project_name || 'Time entry',
          quantity: hours,
          unit: 'hours',
          rate,
          amount: Math.round(hours * rate * 100) / 100,
          source_type: 'time_entry',
          source_id: entry.id,
        })
      }
    }

    if (formData.include_projects) {
      const projects = await ProjectsService.getProjects(organizationId)

      for (const project of projects) {
        if (invoiced.projects.has(project.id)) continue
        if (project.status !== 'active' && project.status !== 'completed') continue

        const budget = project.budget ?? 0
        const rate = project.hourly_rate ?? 0
        const hours = project.total_hours ?? 0

        if (budget > 0) {
          items.push({
            id: crypto.randomUUID(),
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
            id: crypto.randomUUID(),
            description: `Project hours: ${project.name}`,
            quantity: hours,
            unit: 'hours',
            rate,
            amount: Math.round(hours * rate * 100) / 100,
            source_type: 'project',
            source_id: project.id,
          })
        }
      }
    }

    return items
  }

  /**
   * Invoice numbers are allocated by a database function holding an advisory
   * lock, so two people creating invoices at once cannot collide.
   */
  private static async nextInvoiceNumber(organizationId: string): Promise<string> {
    const { data, error } = await supabase.rpc('next_invoice_number', {
      p_organization_id: organizationId,
    })

    if (error) {
      console.error('Error allocating invoice number:', error)
      throw new Error('Failed to allocate invoice number')
    }
    return data as string
  }

  static async createInvoice(
    organizationId: string,
    formData: InvoiceFormData
  ): Promise<Invoice> {
    const client = await ClientService.getClient(formData.client_id, organizationId)
    if (!client) throw new Error('Client not found')

    const lineItems = await this.buildLineItems(organizationId, formData)
    if (lineItems.length === 0) {
      throw new Error('NO_BILLABLE_WORK')
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)
    const taxAmount = Math.round(subtotal * (formData.tax_rate / 100) * 100) / 100
    const total = Math.round((subtotal + taxAmount) * 100) / 100
    const invoiceNumber = await this.nextInvoiceNumber(organizationId)

    const { data: invoiceRow, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        organization_id: organizationId,
        client_id: formData.client_id,
        invoice_number: invoiceNumber,
        issue_date: formData.issue_date,
        due_date: formData.due_date,
        status: 'draft',
        subtotal,
        tax_rate: formData.tax_rate,
        tax_amount: taxAmount,
        total,
        currency: 'EUR',
        notes: formData.notes ?? null,
      }])
      .select()
      .single()

    if (invoiceError || !invoiceRow) {
      console.error('Error creating invoice:', invoiceError)
      throw new Error('Failed to create invoice')
    }

    const { error: itemsError } = await supabase
      .from('invoice_line_items')
      .insert(
        lineItems.map(item => ({
          invoice_id: (invoiceRow as { id: string }).id,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          rate: item.rate,
          amount: item.amount,
          source_type: item.source_type,
          source_id: item.source_id ?? null,
        }))
      )

    if (itemsError) {
      // Without line items the invoice is meaningless — remove the header so a
      // half-written invoice cannot block the work from being billed later.
      await supabase.from('invoices').delete().eq('id', (invoiceRow as { id: string }).id)
      console.error('Error creating invoice line items:', itemsError)
      throw new Error('Failed to create invoice')
    }

    const created = await this.getInvoice((invoiceRow as { id: string }).id, organizationId)
    if (!created) throw new Error('Failed to load created invoice')
    return created
  }

  static async updateInvoiceStatus(
    id: string,
    organizationId: string,
    status: InvoiceStatus
  ): Promise<Invoice | null> {
    const updates: Record<string, unknown> = { status }
    if (status === 'paid') updates.paid_at = new Date().toISOString()

    const { error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error updating invoice status:', error)
      throw new Error('Failed to update invoice')
    }

    const invoice = await this.getInvoice(id, organizationId)

    // A paid invoice is real revenue — mirror it into the finance ledger.
    if (invoice && status === 'paid') {
      await FinanceService.recordFromSource({
        organizationId,
        direction: 'in',
        amount: invoice.total,
        currency: invoice.currency,
        occurredOn: new Date().toISOString().split('T')[0],
        description: `Invoice ${invoice.invoice_number} — ${invoice.client_name}`,
        sourceType: 'invoice',
        sourceId: invoice.id,
        categorySlug: 'client_revenue',
      })
    }

    return invoice
  }

  /** CSV export of a single invoice, one row per line item plus totals. */
  static exportInvoiceCsv(invoice: Invoice): string {
    const escape = (value: string | number) => {
      const text = String(value ?? '')
      return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const rows: string[][] = [
      ['Invoice', invoice.invoice_number],
      ['Client', invoice.client_name],
      ['Issue date', invoice.issue_date],
      ['Due date', invoice.due_date],
      ['Status', invoice.status],
      [],
      ['Description', 'Quantity', 'Unit', 'Rate', 'Amount'],
      ...invoice.line_items.map(item => [
        item.description,
        String(item.quantity),
        item.unit,
        item.rate.toFixed(2),
        item.amount.toFixed(2),
      ]),
      [],
      ['Subtotal', '', '', '', invoice.subtotal.toFixed(2)],
      [`Tax (${invoice.tax_rate}%)`, '', '', '', invoice.tax_amount.toFixed(2)],
      ['Total', '', '', '', invoice.total.toFixed(2)],
    ]

    return rows.map(row => row.map(escape).join(',')).join('\n')
  }

  static async deleteInvoice(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting invoice:', error)
      throw new Error('Failed to delete invoice')
    }
  }
}
