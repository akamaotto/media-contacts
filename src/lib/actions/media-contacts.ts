// Consolidated media contacts actions - single source of truth from backend

// Main media contacts operations (including delete)
export { 
  getMediaContactsAction, 
  upsertMediaContactAction,
  updateMediaContact,
  deleteMediaContact,
  type PaginatedMediaContactsActionResult, 
  type GetMediaContactsParams,
  type UpsertMediaContactActionState,
  type UpsertMediaContactData,
  type UpdateMediaContactReturnType,
  type DeleteMediaContactResult
} from '../../backend/media-contacts/actions'

// Related entity operations
export * from '../../backend/beats/actions'
export * from '../../backend/countries/actions'
export * from '../../backend/languages/actions'
export * from '../../backend/outlets/actions'
export * from '../../backend/regions/actions'
