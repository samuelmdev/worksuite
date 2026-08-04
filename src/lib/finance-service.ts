import { supabase } from './supabase'

/**
 * A single ledger of money in and out.
 *
 * Entries arrive two ways: automatically, when something elsewhere in the app
 * settles (an invoice is paid, a commission is paid out, a subscription is
 * charged), and manually for everything the app does not model — rent,
 * software, equipment. `source_type`/`source_id` distinguish the two and make
 * automatic entries idempotent.
 */
export type TransactionDirection = 'in' | 'out'

export type TransactionSource =
  | 'invoice'
  | 'subscription'
  | 'commission'
  | 'bonus'
  | 'salary'
  | 'contract'
  | 'manual'

export interface FinanceCategory {
  id: string
  organization_id: string | null
  slug: string
  name: string
  direction: TransactionDirection
  is_system: boolean
  created_at: string
}

export interface FinanceTransaction {
  id: string
  organization_id: string
  direction: TransactionDirection
  amount: number
  currency: string
  occurred_on: string
  description: string
  reference: string | null
  category_id: string | null
  source_type: TransactionSource
  source_id: string | null
  created_by: string | null
  created_at: string
  /** Joined for display. */
  category_name?: string | null
  category_slug?: string | null
}

export interface FinanceTransactionFormData {
  organization_id: string
  direction: TransactionDirection
  amount: number
  currency?: string
  occurred_on: string
  description: string
  reference?: string | null
  category_id?: string | null
  source_type?: TransactionSource
  source_id?: string | null
  created_by?: string | null
}

export interface FinanceSummary {
  total_in: number
  total_out: number
  net: number
  currency: string
  /** Money invoiced but not yet collected. */
  outstanding_receivables: number
  by_category: { name: string; slug: string; direction: TransactionDirection; amount: number }[]
  by_month: { month: string; incoming: number; outgoing: number; net: number }[]
}

export interface FinanceFilters {
  direction?: TransactionDirection
  categoryId?: string
  sourceType?: TransactionSource
  from?: string
  to?: string
}

const round = (n: number) => Math.round(n * 100) / 100

export class FinanceService {
  // ------------------------------------------------------------ categories ---

  static async getCategories(organizationId: string): Promise<FinanceCategory[]> {
    // System categories have a null organization_id and are shared by everyone.
    const { data, error } = await supabase
      .from('finance_categories')
      .select('*')
      .or(`organization_id.eq.${organizationId},organization_id.is.null`)
      .order('direction', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      console.error('Error fetching finance categories:', error)
      throw new Error('Failed to fetch categories')
    }
    return (data as FinanceCategory[]) || []
  }

  static async createCategory(category: {
    organization_id: string
    name: string
    slug: string
    direction: TransactionDirection
  }): Promise<FinanceCategory> {
    const { data, error } = await supabase
      .from('finance_categories')
      .insert([{ ...category, is_system: false }])
      .select()
      .single()

    if (error) {
      console.error('Error creating finance category:', error)
      throw new Error('Failed to create category')
    }
    return data as FinanceCategory
  }

  // ---------------------------------------------------------- transactions ---

  static async getTransactions(
    organizationId: string,
    filters: FinanceFilters = {}
  ): Promise<FinanceTransaction[]> {
    let query = supabase
      .from('finance_transactions')
      .select('*, finance_categories:category_id(name, slug)')
      .eq('organization_id', organizationId)
      .order('occurred_on', { ascending: false })

    if (filters.direction) query = query.eq('direction', filters.direction)
    if (filters.categoryId) query = query.eq('category_id', filters.categoryId)
    if (filters.sourceType) query = query.eq('source_type', filters.sourceType)
    if (filters.from) query = query.gte('occurred_on', filters.from)
    if (filters.to) query = query.lte('occurred_on', filters.to)

    const { data, error } = await query

    if (error) {
      console.error('Error fetching finance transactions:', error)
      throw new Error('Failed to fetch transactions')
    }

    return ((data as any[]) || []).map(row => ({
      ...row,
      category_name: row.finance_categories?.name ?? null,
      category_slug: row.finance_categories?.slug ?? null,
    })) as FinanceTransaction[]
  }

  static async createTransaction(
    form: FinanceTransactionFormData
  ): Promise<FinanceTransaction> {
    const { data, error } = await supabase
      .from('finance_transactions')
      .insert([{
        ...form,
        currency: form.currency ?? 'EUR',
        source_type: form.source_type ?? 'manual',
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating finance transaction:', error)
      throw new Error('Failed to record transaction')
    }
    return data as FinanceTransaction
  }

  static async updateTransaction(
    id: string,
    organizationId: string,
    updates: Partial<FinanceTransactionFormData>
  ): Promise<void> {
    const { error } = await supabase
      .from('finance_transactions')
      .update(updates)
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error updating finance transaction:', error)
      throw new Error('Failed to update transaction')
    }
  }

  static async deleteTransaction(id: string, organizationId: string): Promise<void> {
    // Automatic entries are owned by the record that produced them; deleting
    // one by hand would silently desync the ledger from billing.
    const { data: existing } = await supabase
      .from('finance_transactions')
      .select('source_type')
      .eq('id', id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (existing && (existing as { source_type: string }).source_type !== 'manual') {
      throw new Error('SYSTEM_TRANSACTION')
    }

    const { error } = await supabase
      .from('finance_transactions')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting finance transaction:', error)
      throw new Error('Failed to delete transaction')
    }
  }

  /**
   * Mirrors an event from elsewhere in the app into the ledger.
   *
   * Idempotent on (source_type, source_id): marking an invoice paid twice, or a
   * Stripe webhook being retried, must not double-count revenue.
   */
  static async recordFromSource(params: {
    organizationId: string
    direction: TransactionDirection
    amount: number
    currency?: string
    occurredOn: string
    description: string
    sourceType: TransactionSource
    sourceId: string
    categorySlug?: string
    reference?: string
  }): Promise<FinanceTransaction | null> {
    const {
      organizationId, direction, amount, currency = 'EUR', occurredOn,
      description, sourceType, sourceId, categorySlug, reference,
    } = params

    const { data: existing } = await supabase
      .from('finance_transactions')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .maybeSingle()

    if (existing) return null

    let categoryId: string | null = null
    if (categorySlug) {
      const { data: category } = await supabase
        .from('finance_categories')
        .select('id')
        .eq('slug', categorySlug)
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .limit(1)
        .maybeSingle()
      categoryId = (category as { id: string } | null)?.id ?? null
    }

    try {
      return await this.createTransaction({
        organization_id: organizationId,
        direction,
        amount,
        currency,
        occurred_on: occurredOn,
        description,
        reference: reference ?? null,
        category_id: categoryId,
        source_type: sourceType,
        source_id: sourceId,
      })
    } catch (error) {
      // The ledger must never block the operation that triggered it.
      console.error('Failed to mirror transaction into finance ledger:', error)
      return null
    }
  }

  // --------------------------------------------------------------- summary ---

  static async getSummary(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<FinanceSummary> {
    const [transactions, receivables] = await Promise.all([
      this.getTransactions(organizationId, { from: startDate, to: endDate }),
      this.getOutstandingReceivables(organizationId),
    ])

    let totalIn = 0
    let totalOut = 0
    const categoryTotals = new Map<
      string,
      { name: string; slug: string; direction: TransactionDirection; amount: number }
    >()
    const monthTotals = new Map<string, { incoming: number; outgoing: number }>()

    for (const tx of transactions) {
      if (tx.direction === 'in') totalIn += tx.amount
      else totalOut += tx.amount

      const key = tx.category_slug ?? 'uncategorised'
      const existing = categoryTotals.get(key)
      if (existing) {
        existing.amount += tx.amount
      } else {
        categoryTotals.set(key, {
          name: tx.category_name ?? 'Uncategorised',
          slug: key,
          direction: tx.direction,
          amount: tx.amount,
        })
      }

      const month = tx.occurred_on.slice(0, 7)
      const bucket = monthTotals.get(month) ?? { incoming: 0, outgoing: 0 }
      if (tx.direction === 'in') bucket.incoming += tx.amount
      else bucket.outgoing += tx.amount
      monthTotals.set(month, bucket)
    }

    return {
      total_in: round(totalIn),
      total_out: round(totalOut),
      net: round(totalIn - totalOut),
      currency: transactions[0]?.currency ?? 'EUR',
      outstanding_receivables: receivables,
      by_category: [...categoryTotals.values()]
        .map(c => ({ ...c, amount: round(c.amount) }))
        .sort((a, b) => b.amount - a.amount),
      by_month: [...monthTotals.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, totals]) => ({
          month,
          incoming: round(totals.incoming),
          outgoing: round(totals.outgoing),
          net: round(totals.incoming - totals.outgoing),
        })),
    }
  }

  /** Invoices issued but not yet paid. */
  static async getOutstandingReceivables(organizationId: string): Promise<number> {
    const { data, error } = await supabase
      .from('invoices')
      .select('total')
      .eq('organization_id', organizationId)
      .in('status', ['sent', 'overdue'])

    if (error) {
      console.error('Error fetching outstanding receivables:', error)
      return 0
    }

    return round(((data as { total: number }[]) || []).reduce((sum, i) => sum + i.total, 0))
  }
}
