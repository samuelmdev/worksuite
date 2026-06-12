// Subscription and feature gating utilities

export interface UserSubscription {
  modules: string[]
  features: string[]
  plan: 'basic' | 'professional' | 'enterprise'
}

// Mock subscription data - in real app this would come from your database
export const mockUserSubscriptions: Record<string, UserSubscription> = {
  'time-only': {
    modules: ['time_tracking'],
    features: ['basic_clients', 'time_entries'],
    plan: 'basic'
  },
  'crm-only': {
    modules: ['crm'],
    features: ['advanced_clients', 'deals', 'contracts'],
    plan: 'basic'
  },
  'full': {
    modules: ['time_tracking', 'crm', 'projects'],
    features: ['basic_clients', 'advanced_clients', 'time_entries', 'deals', 'contracts', 'project_management'],
    plan: 'professional'
  }
}

export class SubscriptionService {
  // Get user's subscription (in real app, this would fetch from database)
  static getUserSubscription(userId: string): UserSubscription {
    // For demo purposes, return time-only subscription
    // In real app: fetch from database based on userId
    return mockUserSubscriptions['time-only']
  }

  // Check if user has access to a specific module
  static hasModule(userId: string, module: 'time_tracking' | 'crm' | 'projects'): boolean {
    const subscription = this.getUserSubscription(userId)
    return subscription.modules.includes(module)
  }

  // Check if user has access to a specific feature
  static hasFeature(userId: string, feature: string): boolean {
    const subscription = this.getUserSubscription(userId)
    return subscription.features.includes(feature)
  }

  // Check if user should see time-tracking client management
  // Hide it if they have CRM module (which has advanced client management)
  static shouldShowTimeTrackingClients(userId: string): boolean {
    const hasCRM = this.hasModule(userId, 'crm')
    const hasTimeTracking = this.hasModule(userId, 'time_tracking')
    
    // Show time-tracking clients only if user has time-tracking but not CRM
    return hasTimeTracking && !hasCRM
  }

  // Check if user should see CRM client management
  static shouldShowCRMClientManagement(userId: string): boolean {
    return this.hasModule(userId, 'crm')
  }
}

// React hook for subscription checking
export function useSubscription(userId?: string) {
  if (!userId) {
    return {
      hasModule: () => false,
      hasFeature: () => false,
      shouldShowTimeTrackingClients: false,
      shouldShowCRMClientManagement: false,
      subscription: null
    }
  }

  const subscription = SubscriptionService.getUserSubscription(userId)

  return {
    hasModule: (module: 'time_tracking' | 'crm' | 'projects') => 
      SubscriptionService.hasModule(userId, module),
    hasFeature: (feature: string) => 
      SubscriptionService.hasFeature(userId, feature),
    shouldShowTimeTrackingClients: 
      SubscriptionService.shouldShowTimeTrackingClients(userId),
    shouldShowCRMClientManagement: 
      SubscriptionService.shouldShowCRMClientManagement(userId),
    subscription
  }
}
