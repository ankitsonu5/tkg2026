import type { CollectionConfig } from 'payload'

import { ROLES, ROLE_LABELS, isAdmin } from '@/access/roles'
import { adminOnly, roleFieldAccess } from '@/access'
import { INQUIRY_ROUTE_IDS } from '@/baseline/inquiry-routes'
import { guardPrivilegedFields } from '@/access/guard'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: {
    // Lockout and token lifetime are security defaults, adjustable per environment.
    maxLoginAttempts: 5,
    lockTime: 10 * 60 * 1000,
    tokenExpiration: 2 * 60 * 60,
  },
  admin: {
    useAsTitle: 'email',
    group: 'Administration',
    defaultColumns: ['email', 'name', 'roles'],
  },
  hooks: {
    beforeOperation: [
      guardPrivilegedFields({
        fields: ['roles', 'assignedRoutes'],
        allowedRoles: [],
        message: 'Only an administrator may change roles or route assignments.',
      }),
    ],
  },
  access: {
    // Only administrators manage the user list; everyone else may read/update themselves.
    create: adminOnly,
    delete: adminOnly,
    read: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    update: ({ req: { user } }) => {
      if (!user) return false
      if (isAdmin(user)) return true
      return { id: { equals: user.id } }
    },
    admin: ({ req: { user } }) => Boolean(user),
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['qa'],
      options: ROLES.map((r) => ({ label: ROLE_LABELS[r], value: r })),
      // Privilege escalation guard: a user cannot grant themselves roles.
      access: { create: roleFieldAccess('administrator'), update: roleFieldAccess('administrator') },
      admin: { description: 'A user may hold several explicit roles. Least privilege applies.' },
    },
    {
      name: 'assignedRoutes',
      type: 'select',
      hasMany: true,
      options: INQUIRY_ROUTE_IDS.map((r) => ({ label: r, value: r })),
      access: { create: roleFieldAccess('administrator'), update: roleFieldAccess('administrator') },
      admin: {
        description: 'Inquiry routes this route owner may see and work. Empty means no inquiry access.',
        condition: (data) => Array.isArray(data?.roles) && data.roles.includes('route-owner'),
      },
    },
  ],
}
