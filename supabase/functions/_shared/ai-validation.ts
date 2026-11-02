export type AIResult = {
  assistantMessage: string;
  status: 'needs_input' | 'proposal' | 'answer';
  missingFields: string[];
  state: { destination: string | null; startDate: string | null; endDate: string | null; travelers: number | null; budget: number | null; currency: string | null; noBudgetLimit: boolean; interests: string[] };
  trip: { title: string | null; destination: string | null; startDate: string | null; endDate: string | null; travelers: number | null; travelerType: string | null; budget: number | null; currency: string | null; noBudgetLimit: boolean; interests: string[] };
  activities: { dayNumber: number; title: string; location: string | null; startsAt: string | null; notes: string | null; estimatedCost: number | null; sortOrder: number }[];
  packingItems: { name: string; category: string; quantity: number }[];
  budgetTips: string[];
  assumptions: string[];
};

export const outputSchema = {
  type: 'object', additionalProperties: false,
  required: ['assistantMessage', 'status', 'missingFields', 'state', 'trip', 'activities', 'packingItems', 'budgetTips', 'assumptions'],
  properties: {
    assistantMessage: { type: 'string' },
    status: { type: 'string', enum: ['needs_input', 'proposal', 'answer'] },
    missingFields: { type: 'array', items: { type: 'string' }, maxItems: 8 },
    state: { type: 'object', additionalProperties: false, required: ['destination', 'startDate', 'endDate', 'travelers', 'budget', 'currency', 'noBudgetLimit', 'interests'], properties: {
      destination: { type: ['string', 'null'] }, startDate: { type: ['string', 'null'] }, endDate: { type: ['string', 'null'] }, travelers: { type: ['integer', 'null'] }, budget: { type: ['number', 'null'] }, currency: { type: ['string', 'null'] }, noBudgetLimit: { type: 'boolean' }, interests: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    } },
    trip: { type: 'object', additionalProperties: false, required: ['title', 'destination', 'startDate', 'endDate', 'travelers', 'travelerType', 'budget', 'currency', 'noBudgetLimit', 'interests'], properties: {
      title: { type: ['string', 'null'] }, destination: { type: ['string', 'null'] }, startDate: { type: ['string', 'null'] }, endDate: { type: ['string', 'null'] }, travelers: { type: ['integer', 'null'] }, travelerType: { type: ['string', 'null'] }, budget: { type: ['number', 'null'] }, currency: { type: ['string', 'null'] }, noBudgetLimit: { type: 'boolean' }, interests: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    } },
    activities: { type: 'array', maxItems: 30, items: { type: 'object', additionalProperties: false, required: ['dayNumber', 'title', 'location', 'startsAt', 'notes', 'estimatedCost', 'sortOrder'], properties: {
      dayNumber: { type: 'integer', minimum: 1, maximum: 366 }, title: { type: 'string' }, location: { type: ['string', 'null'] }, startsAt: { type: ['string', 'null'] }, notes: { type: ['string', 'null'] }, estimatedCost: { type: ['number', 'null'], minimum: 0 }, sortOrder: { type: 'integer', minimum: 0 },
    } } },
    packingItems: { type: 'array', maxItems: 40, items: { type: 'object', additionalProperties: false, required: ['name', 'category', 'quantity'], properties: { name: { type: 'string' }, category: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 20 } } } },
    budgetTips: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    assumptions: { type: 'array', items: { type: 'string' }, maxItems: 12 },
  },
};

type Schema = { type: string | string[]; required?: string[]; properties?: Record<string, Schema>; items?: Schema; enum?: unknown[]; minimum?: number; maximum?: number; maxItems?: number; additionalProperties?: boolean };
function matches(value: unknown, schema: Schema): boolean {
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (value === null) return types.includes('null');
  if (schema.enum && !schema.enum.includes(value)) return false;
  if (typeof value === 'string') return types.includes('string') && value.length <= 2000;
  if (typeof value === 'boolean') return types.includes('boolean');
  if (typeof value === 'number') return Number.isFinite(value) && (types.includes('number') || (types.includes('integer') && Number.isInteger(value))) && value >= (schema.minimum ?? -Infinity) && value <= (schema.maximum ?? Infinity);
  if (Array.isArray(value)) return types.includes('array') && value.length <= (schema.maxItems ?? 40) && !!schema.items && value.every(v => matches(v, schema.items!));
  if (typeof value !== 'object' || !types.includes('object')) return false;
  const item = value as Record<string, unknown>;
  return (schema.required ?? []).every(k => k in item) && Object.entries(item).every(([k, v]) => !!schema.properties?.[k] && matches(v, schema.properties[k]));
}
export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value;
}
export function validResult(value: unknown): value is AIResult {
  if (!matches(value, outputSchema)) return false;
  const v = value as AIResult;
  for (const plan of [v.state, v.trip]) {
    if (plan.travelers !== null && (!Number.isInteger(plan.travelers) || plan.travelers < 1 || plan.travelers > 100)) return false;
    if (plan.budget !== null && (plan.budget < 0 || plan.budget > 1e10)) return false;
    if (plan.currency !== null && !/^[A-Z]{3}$/.test(plan.currency)) return false;
    if (plan.startDate !== null && !validDate(plan.startDate)) return false;
    if (plan.endDate !== null && !validDate(plan.endDate)) return false;
    if (plan.startDate && plan.endDate && (plan.endDate < plan.startDate || (Date.parse(plan.endDate) - Date.parse(plan.startDate)) / 86400000 >= 366)) return false;
  }
  return v.activities.every(a => a.title.trim().length > 0 && a.title.length <= 180 && a.dayNumber >= 1 && a.dayNumber <= 366 && (a.estimatedCost === null || a.estimatedCost <= 1e10) && (a.startsAt === null || /^([01]\d|2[0-3]):[0-5]\d(:00)?$/.test(a.startsAt))) && v.packingItems.every(p => p.name.trim().length > 0 && p.name.length <= 180);
}
export function readyToPropose(result: AIResult) {
  const trip = result.trip;
  const start = trip.startDate ?? result.state.startDate;
  const end = trip.endDate ?? result.state.endDate;
  if (result.status !== 'proposal' || !(trip.destination ?? result.state.destination)?.trim() || !validDate(start) || !validDate(end) || !(trip.travelers ?? result.state.travelers)) return false;
  const days = (Date.parse(end) - Date.parse(start)) / 86400000 + 1;
  return days >= 1 && days <= 366 && result.activities.every(a => a.dayNumber <= days);
}

