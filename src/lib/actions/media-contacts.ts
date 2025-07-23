// Consolidated media contacts actions - single source of truth from backend

// Main table operations
export { 
  getMediaContactsAction, 
  upsertMediaContactAction,
  updateMediaContact,
  type PaginatedMediaContactsActionResult, 
  type GetMediaContactsParams,
  type UpsertMediaContactActionState,
  type UpsertMediaContactData,
  type UpdateMediaContactReturnType
} from '../../backend/media-contacts-table/actions'

// Filter and related operations
export { deleteMediaContact } from '../../backend/media-contacts-filters/delete-media-contact'
export * from '../../backend/media-contacts-filters/beat-actions'
export * from '../../backend/media-contacts-filters/country-actions'
export * from '../../backend/media-contacts-filters/language-actions'
export * from '../../backend/media-contacts-filters/outlet-actions'
export * from '../../backend/media-contacts-filters/region-actions'
