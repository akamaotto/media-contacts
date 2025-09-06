// Consolidated media contacts actions - single source of truth from backend

// Main media contacts operations (including delete)
export {
  getMediaContactsAction,
  upsertMediaContactAction,
  deleteMediaContactAction,
} from '@/features/media-contacts/lib/actions'

// Backwards-compatible alias for legacy imports
export { deleteMediaContactAction as deleteMediaContact } from '@/features/media-contacts/lib/actions'

// Re-export related entity operations from features
export * from '@/features/beats/lib/actions'
export * from '@/features/countries/lib/actions'
export * from '@/features/languages/lib/actions'
export * from '@/features/outlets/lib/actions'
export * from '@/features/regions/lib/actions'

// Also re-export commonly used read-only queries so UI can import from one place
export * from '@/features/countries/lib/queries'
export * from '@/features/outlets/lib/queries'
