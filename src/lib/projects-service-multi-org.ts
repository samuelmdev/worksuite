import { supabase } from './supabase'

// Define project types manually since the database types might not be available
export interface Project {
  id: string
  name: string
  description?: string
  type: 'general' | 'route' | 'internal' | 'external'
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date?: string
  end_date?: string
  budget?: number
  hourly_rate?: number
  progress?: number
  route_notes?: string
  estimated_duration_hours?: number
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
}

type ProjectClient = any
type ProjectEmployee = any

export interface ProjectFormData {
  name: string
  description?: string
  type: 'general' | 'route' | 'internal' | 'external'
  status: 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  start_date?: string
  end_date?: string
  budget?: number
  hourly_rate?: number
  progress?: number
  route_notes?: string
  estimated_duration_hours?: number
  organization_id: string
  created_by: string
}

export interface ProjectWithDetails extends Project {
  client_count: number
  employee_count: number
  total_hours: number
  total_revenue: number
  client_names: string[]
  employee_names: string[]
}

export class ProjectsService {
  // Get all projects for an organization
  static async getProjects(organizationId: string): Promise<ProjectWithDetails[]> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects:', error)
      throw new Error('Failed to fetch projects')
    }

    // Transform the data to include calculated fields
    return (data || []).map(project => ({
      ...project,
      client_count: 0,
      employee_count: 0,
      total_hours: 0,
      total_revenue: 0,
      client_names: [],
      employee_names: []
    }))
  }

  // Get projects by type (useful for route projects)
  static async getProjectsByType(organizationId: string, type: string): Promise<ProjectWithDetails[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_clients(count),
        project_employees(count)
      `)
      .eq('organization_id', organizationId)
      .eq('type', type)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching projects by type:', error)
      throw new Error('Failed to fetch projects by type')
    }

    return (data || []).map(project => ({
      ...project,
      client_count: project.project_clients?.[0]?.count || 0,
      employee_count: project.project_employees?.[0]?.count || 0,
      total_hours: 0,
      total_revenue: 0,
      client_names: [],
      employee_names: []
    }))
  }

  // Get route projects with client and employee details
  static async getRouteProjects(organizationId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('route_projects')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching route projects:', error)
      throw new Error('Failed to fetch route projects')
    }

    return data || []
  }

  // Get a single project by ID
  static async getProject(id: string, organizationId: string): Promise<ProjectWithDetails | null> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_clients(
          client_id,
          clients(name)
        ),
        project_employees(
          user_id,
          role,
          users(first_name, last_name)
        )
      `)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null // Project not found
      }
      console.error('Error fetching project:', error)
      throw new Error('Failed to fetch project')
    }

    return {
      ...data,
      client_count: data.project_clients?.length || 0,
      employee_count: data.project_employees?.length || 0,
      total_hours: 0,
      total_revenue: 0,
      client_names: data.project_clients?.map((pc: any) => pc.clients?.name).filter(Boolean) || [],
      employee_names: data.project_employees?.map((pe: any) => `${pe.users?.first_name} ${pe.users?.last_name}`).filter(Boolean) || []
    }
  }

  // Create a new project
  static async createProject(projectData: ProjectFormData): Promise<Project> {
    const { data, error } = await supabase
      .from('projects')
      .insert([projectData])
      .select()
      .single()

    if (error) {
      console.error('Error creating project:', error)
      throw new Error('Failed to create project')
    }

    return data
  }

  // Update a project
  static async updateProject(id: string, updates: Partial<ProjectFormData>, organizationId: string, updatedByUserId?: string): Promise<Project> {
    console.log('updateProject called with updates:', updates)
    
    // Remove fields that shouldn't be updated directly, but keep updated_by for the database
    const { organization_id, created_by, created_at, updated_at, ...safeUpdates } = updates as any
    
    // Set updated_by to the current user if provided
    if (updatedByUserId) {
      safeUpdates.updated_by = updatedByUserId
    }
    
    console.log('safeUpdates after filtering:', safeUpdates)
    console.log('Updating project with ID:', id, 'Organization ID:', organizationId)

    const { data, error } = await supabase
      .from('projects')
      .update(safeUpdates)
      .eq('id', id)
      .eq('organization_id', organizationId)
      .select()
      .single()

    if (error) {
      console.error('Error updating project:', error)
      console.error('Update data that caused error:', safeUpdates)
      console.error('Project ID:', id, 'Organization ID:', organizationId)
      throw new Error('Failed to update project')
    }

    console.log('Project updated successfully:', data)
    return data
  }

  // Delete a project
  static async deleteProject(id: string, organizationId: string): Promise<void> {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error deleting project:', error)
      throw new Error('Failed to delete project')
    }
  }

  // Assign clients to a project
  static async assignClientsToProject(projectId: string, clientIds: string[], organizationId: string): Promise<void> {
    // First, verify the project belongs to the organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found or access denied')
    }

    // Remove existing assignments
    const { error: deleteError } = await supabase
      .from('project_clients')
      .delete()
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Error removing existing client assignments:', deleteError)
      throw new Error('Failed to update client assignments')
    }

    // Add new assignments
    if (clientIds.length > 0) {
      const assignments = clientIds.map(clientId => ({
        project_id: projectId,
        client_id: clientId,
        organization_id: organizationId
      }))

      const { error: insertError } = await supabase
        .from('project_clients')
        .insert(assignments)

      if (insertError) {
        console.error('Error assigning clients to project:', insertError)
        throw new Error('Failed to assign clients to project')
      }
    }
  }

  // Assign employees to a project
  static async assignEmployeesToProject(projectId: string, employeeAssignments: Array<{user_id: string, role: string, hourly_rate?: number}>, organizationId: string): Promise<void> {
    // First, verify the project belongs to the organization
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('id')
      .eq('id', projectId)
      .eq('organization_id', organizationId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found or access denied')
    }

    // Remove existing assignments
    const { error: deleteError } = await supabase
      .from('project_employees')
      .delete()
      .eq('project_id', projectId)

    if (deleteError) {
      console.error('Error removing existing employee assignments:', deleteError)
      throw new Error('Failed to update employee assignments')
    }

    // Add new assignments
    if (employeeAssignments.length > 0) {
      const assignments = employeeAssignments.map(assignment => ({
        project_id: projectId,
        user_id: assignment.user_id,
        role: assignment.role,
        hourly_rate: assignment.hourly_rate,
        organization_id: organizationId
      }))

      const { error: insertError } = await supabase
        .from('project_employees')
        .insert(assignments)

      if (insertError) {
        console.error('Error assigning employees to project:', insertError)
        throw new Error('Failed to assign employees to project')
      }
    }
  }

  // Get project statistics
  static async getProjectStats(organizationId: string): Promise<{
    total_projects: number
    active_projects: number
    completed_projects: number
    route_projects: number
    total_budget: number
    total_revenue: number
  }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)

    if (error) {
      console.error('Error fetching project stats:', error)
      throw new Error('Failed to fetch project statistics')
    }

    const projects = data || []

    return {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      route_projects: projects.filter(p => p.type === 'route').length,
      total_budget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      total_revenue: 0 // Will be calculated from time entries if needed
    }
  }

  // Get projects for a specific user (their assignments)
  static async getUserProjects(userId: string, organizationId: string): Promise<ProjectWithDetails[]> {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        project_employees!inner(user_id),
        project_clients(count),
        time_entries!inner(
          billable_hours,
          hourly_rate
        )
      `)
      .eq('organization_id', organizationId)
      .eq('project_employees.user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user projects:', error)
      throw new Error('Failed to fetch user projects')
    }

    return (data || []).map(project => ({
      ...project,
      client_count: project.project_clients?.[0]?.count || 0,
      employee_count: 0, // Will be calculated separately
      total_hours: project.time_entries?.reduce((sum: number, entry: any) => sum + (entry.billable_hours || 0), 0) || 0,
      total_revenue: project.time_entries?.reduce((sum: number, entry: any) => sum + ((entry.billable_hours || 0) * (entry.hourly_rate || 0)), 0) || 0,
      client_names: [],
      employee_names: []
    }))
  }
}
