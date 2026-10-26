// Job tabs along the top of Discover. Emoji give the tabs their picture.
// `query` null opens the full job list.
export const BROWSE = [
  { id: 'windows', label: 'Windows', query: 'Window cleaner', emoji: '🪟' },
  { id: 'cleaning', label: 'Cleaning', query: 'House cleaning service', emoji: '🧽' },
  { id: 'plumbing', label: 'Plumbing', query: 'Plumber', emoji: '🪠' },
  { id: 'electrical', label: 'Electrical', query: 'Electrician', emoji: '💡' },
  { id: 'garden', label: 'Garden', query: 'Gardener', emoji: '🪴' },
  { id: 'painting', label: 'Painting', query: 'House painter', emoji: '🎨' },
  { id: 'handyman', label: 'Handyman', query: 'Handyman', emoji: '🧰' },
  { id: 'all', label: 'All jobs', query: null, emoji: '🔎' },
]

// Full job list (the search screen's suggestions). `hint` is the line under
// each one. `keywords` are used to match free-text searches to a category
// (for labels and demo data).
export const CATEGORIES = [
  { id: 'window', label: 'Window Cleaners', single: 'Window cleaner', query: 'window cleaner', icon: 'window', color: '#32ade6', emoji: '🪟', hint: 'Windows, glass doors and skylights', keywords: ['window', 'glass'] },
  { id: 'plumber', label: 'Plumbers', single: 'Plumber', query: 'plumber', icon: 'wrench', color: '#007aff', emoji: '🪠', hint: 'Leaks, drains and geysers', keywords: ['plumb', 'pipe', 'drain', 'leak', 'geyser'] },
  { id: 'electrician', label: 'Electricians', single: 'Electrician', query: 'electrician', icon: 'zap', color: '#ffcc00', emoji: '💡', hint: 'Wiring, plugs and DB boards', keywords: ['electric', 'wiring', 'power'] },
  { id: 'gardener', label: 'Gardeners', single: 'Gardener', query: 'gardener', icon: 'leaf', color: '#34c759', emoji: '🪴', hint: 'Lawns, hedges and garden care', keywords: ['garden', 'lawn', 'landscap', 'tree'] },
  { id: 'painter', label: 'Painters', single: 'Painter', query: 'house painter', icon: 'roller', color: '#ff2d55', emoji: '🎨', hint: 'Inside and outside walls', keywords: ['paint'] },
  { id: 'cleaner', label: 'House Cleaners', single: 'House cleaner', query: 'house cleaning service', icon: 'sparkles', color: '#af52de', emoji: '🧽', hint: 'Homes, flats and move-out cleans', keywords: ['clean', 'maid', 'domestic'] },
  { id: 'handyman', label: 'Handymen', single: 'Handyman', query: 'handyman', icon: 'hammer', color: '#ff9500', emoji: '🧰', hint: 'Small fixes around the house', keywords: ['handy', 'repair', 'fix'] },
  { id: 'locksmith', label: 'Locksmiths', single: 'Locksmith', query: 'locksmith', icon: 'key', color: '#a2845e', emoji: '🔑', hint: 'Locked out, new locks and keys', keywords: ['lock', 'key'] },
  { id: 'mechanic', label: 'Mechanics', single: 'Mechanic', query: 'car mechanic', icon: 'car', color: '#5856d6', emoji: '🚗', hint: 'Services, repairs and tyres', keywords: ['mechanic', 'car', 'auto', 'tyre', 'tire'] },
  { id: 'roofer', label: 'Roofers', single: 'Roofer', query: 'roofer', icon: 'home', color: '#ff3b30', emoji: '🏠', hint: 'Leaks, gutters and new roofs', keywords: ['roof', 'gutter'] },
  { id: 'movers', label: 'Movers', single: 'Removal company', query: 'moving company', icon: 'truck', color: '#00c7be', emoji: '📦', hint: 'Moving house or office', keywords: ['move', 'mover', 'removal'] },
  { id: 'pest', label: 'Pest Control', single: 'Pest control', query: 'pest control', icon: 'bug', color: '#30b0c7', emoji: '🐜', hint: 'Termites, rats and insects', keywords: ['pest', 'termite', 'rat', 'insect'] },
]

export function matchCategory(text) {
  const q = text.toLowerCase()
  return CATEGORIES.find((c) => c.keywords.some((k) => q.includes(k))) ?? null
}
