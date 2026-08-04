/**
 * Minimal client shape used by pickers and summary views.
 *
 * Clients reach components in two shapes: raw `clients` rows (snake_case,
 * nullable columns) and the camelCase UI object built by crm-context. Both
 * satisfy this type, so components that only need to identify and label a
 * client can accept either without a conversion step.
 */
export interface ClientOption {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  company?: string | null
}
