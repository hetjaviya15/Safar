/**
 * Safar Data Models and Domain Types
 * Preserved with JSDoc typedef annotations for IDE autocompletion and documentation.
 *
 * @typedef {import('../../supabase/functions/_shared/geo').Destination} Destination
 * @typedef {'draft' | 'upcoming' | 'ongoing' | 'completed' | 'archived'} TripStatus
 * @typedef {'owner' | 'editor' | 'viewer'} MemberRole
 *
 * @typedef {Object} Trip
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string} destination
 * @property {string | null} [destination_place_id]
 * @property {number | null} [destination_lat]
 * @property {number | null} [destination_lon]
 * @property {string} start_date
 * @property {string} end_date
 * @property {number} travelers
 * @property {string | null} [traveler_type]
 * @property {number | null} budget
 * @property {string} currency
 * @property {boolean} [no_budget_limit]
 * @property {string[]} [interests]
 * @property {TripStatus} status
 * @property {string | null} [cover_image_url]
 * @property {string | null} [archived_at]
 * @property {string} [created_at]
 * @property {string} [updated_at]
 * @property {MemberRole} [member_role]
 *
 * @typedef {Object} Activity
 * @property {string} id
 * @property {string} trip_id
 * @property {number} day_number
 * @property {string} title
 * @property {number | null} [latitude]
 * @property {number | null} [longitude]
 * @property {string | null} [location]
 * @property {string | null} [starts_at]
 * @property {string | null} [ends_at]
 * @property {string | null} [notes]
 * @property {number | null} [estimated_cost]
 * @property {string | null} [currency]
 * @property {number} sort_order
 * @property {boolean} is_completed
 *
 * @typedef {Object} Booking
 * @property {string} id
 * @property {string} trip_id
 * @property {'flight' | 'train' | 'hotel' | 'rental_car' | 'bus' | 'activity' | 'other'} booking_type
 * @property {string} provider
 * @property {string | null} [reference]
 * @property {string | null} [starts_at]
 * @property {string | null} [ends_at]
 * @property {string | null} [departure]
 * @property {string | null} [arrival]
 * @property {number | null} [cost]
 * @property {string | null} [currency]
 * @property {string} status
 * @property {string | null} [notes]
 *
 * @typedef {Object} PackingItem
 * @property {string} id
 * @property {string} trip_id
 * @property {string} name
 * @property {string} category
 * @property {number} quantity
 * @property {boolean} is_packed
 *
 * @typedef {Object} Expense
 * @property {string} id
 * @property {string} trip_id
 * @property {string} title
 * @property {string} category
 * @property {number} amount
 * @property {string} currency
 * @property {string} spent_on
 * @property {string | null} [notes]
 *
 * @typedef {Object} TripNote
 * @property {string} id
 * @property {string} trip_id
 * @property {string} title
 * @property {string} body
 * @property {boolean} is_pinned
 * @property {string} [updated_at]
 *
 * @typedef {Object} TripPhoto
 * @property {string} id
 * @property {string} trip_id
 * @property {string} storage_path
 * @property {string | null} [caption]
 * @property {string} [created_at]
 *
 * @typedef {Object} TripMember
 * @property {string} id
 * @property {string} trip_id
 * @property {string} user_id
 * @property {MemberRole} role
 * @property {string | null} [full_name]
 * @property {string | null} [email]
 *
 * @typedef {Object} TripInvitation
 * @property {string} id
 * @property {string} trip_id
 * @property {string} code
 * @property {'editor' | 'viewer'} role
 * @property {string | null} [invitee_email]
 * @property {string} status
 * @property {string} expires_at
 *
 * @typedef {Object} TripDraft
 * @property {string} title
 * @property {Destination} destination
 * @property {string} startDate
 * @property {string} endDate
 * @property {string} travelerType
 * @property {number} travelers
 * @property {number | null} budget
 * @property {string} currency
 * @property {boolean} noBudgetLimit
 * @property {string[]} interests
 *
 * @typedef {'create_trip_draft' | 'suggest_itinerary' | 'suggest_activities' | 'modify_trip_day' | 'add_activity' | 'packing_suggestions' | 'budget_suggestions' | 'trip_question'} AICapability
 *
 * @typedef {Object} AIConversation
 * @property {string} id
 * @property {string | null} trip_id
 * @property {string | null} title
 * @property {AICapability} capability
 * @property {Record<string, unknown>} state
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 *
 * @typedef {Object} AIMessage
 * @property {string} id
 * @property {string} conversation_id
 * @property {'user' | 'assistant'} role
 * @property {{ text?: string, status?: string, missingFields?: string[], proposalId?: string | null }} content
 * @property {string} created_at
 *
 * @typedef {Object} AIActivityProposal
 * @property {number} dayNumber
 * @property {string} title
 * @property {string | null} [location]
 * @property {string | null} [startsAt]
 * @property {string | null} [notes]
 * @property {number | null} [estimatedCost]
 * @property {number} [sortOrder]
 *
 * @typedef {Object} AITripProposal
 * @property {{ title: string | null, destination: string, startDate: string, endDate: string, travelers: number, travelerType?: string | null, budget?: number | null, currency: string, noBudgetLimit: boolean, interests: string[], coverImageUrl?: string | null }} trip
 * @property {AIActivityProposal[]} activities
 * @property {{ name: string, category: string, quantity: number }[]} [packingItems]
 * @property {string[]} [budgetTips]
 * @property {string[]} assumptions
 *
 * @typedef {Object} AIProposal
 * @property {string} id
 * @property {string} conversation_id
 * @property {string} user_id
 * @property {string | null} trip_id
 * @property {AICapability} capability
 * @property {AITripProposal} proposal
 * @property {'pending' | 'applied' | 'rejected' | 'expired'} status
 * @property {string | null} resulting_trip_id
 * @property {string} created_at
 */

export {};
