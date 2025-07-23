// Consolidated media contacts actions - single source of truth from backend
export { 
  getMediaContactsAction, 
  upsertMediaContactAction,
  updateMediaContact,
  type PaginatedMediaContactsActionResult, 
  type GetMediaContactsParams,
  type UpsertMediaContactActionState,
  type UpsertMediaContactData,
  type UpdateMediaContactReturnType
} from '../../backend/media-contacts/actions'

// Other related actions
export { deleteMediaContact } from '../../app/actions/delete-media-contact'
export * from '../../app/actions/beat-actions'
export * from '../../app/actions/country-actions'
export * from '../../app/actions/language-actions'
export * from '../../app/actions/outlet-actions'
export * from '../../app/actions/region-actions'
