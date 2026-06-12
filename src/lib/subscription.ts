import { supabase } from './supabase'
import { Database } from './supabase'

type Tables = Database['public']['Tables']

export class SubscriptionService {
  // Get all available subscription plans
  static async getSubscriptionPlans() {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true })

    if (error) throw error
    return data
  }

  // Get organization's current subscription
  static async getCurrentSubscription(organizationId: string) {
    const { data, error } = await supabase
      .from('organization_subscriptions')
      .select(`
        *,
        subscription_plans (*)
      `)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = no rows returned
    return data
  }

  // Check if organization has access to a specific feature
  static async hasFeatureAccess(organizationId: string, feature: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription(organizationId)
    
    if (!subscription) return false

    const plan = subscription.subscription_plans
    
    // Check boolean feature flags
    switch (feature) {
      case 'crm':
        return plan.has_crm_access
      case 'time_tracking':
        return plan.has_time_tracking_access
      case 'advanced_reports':
        return plan.has_advanced_reports
      case 'api_access':
        return plan.has_api_access
      case 'priority_support':
        return plan.has_priority_support
      default:
        // Check additional_features JSONB
        return plan.additional_features?.[feature] === true
    }
  }

  // Get organization's subscription status
  static async getSubscriptionStatus(organizationId: string) {
    const subscription = await this.getCurrentSubscription(organizationId)
    
    if (!subscription) {
      return {
        status: 'trial',
        plan: 'trial',
        hasAccess: {
          crm: false,
          time_tracking: false,
          projects: false,
          advanced_reports: false
        }
      }
    }

    const plan = subscription.subscription_plans
    
    return {
      status: subscription.status,
      plan: plan.slug,
      hasAccess: {
        crm: plan.has_crm_access,
        time_tracking: plan.has_time_tracking_access,
        projects: plan.additional_features?.projects === true,
        advanced_reports: plan.has_advanced_reports
      }
    }
  }

  // Create a new subscription (for Stripe webhook handling)
  static async createSubscription(subscription: Tables['organization_subscriptions']['Insert']) {
    return supabase
      .from('organization_subscriptions')
      .insert(subscription)
      .select()
      .single()
  }

  // Update subscription status (for Stripe webhook handling)
  static async updateSubscription(
    stripeSubscriptionId: string, 
    updates: Tables['organization_subscriptions']['Update']
  ) {
    return supabase
      .from('organization_subscriptions')
      .update(updates)
      .eq('stripe_subscription_id', stripeSubscriptionId)
      .select()
      .single()
  }
}
