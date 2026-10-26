// One-tap searches under the Discover search bar.
export const QUICK_SEARCHES = ['Window cleaner', 'Plumber', 'Electrician', 'Pool cleaner', 'Gardener']

// "Browse by job" tiles on Discover. `query` null opens the full job list.
export const BROWSE = [
  { id: 'cleaning', label: 'Cleaning', query: 'House cleaning service', tint: 'blue', icon: 'sparkle' },
  { id: 'plumbing', label: 'Plumbing', query: 'Plumber', tint: 'teal', icon: 'drop' },
  { id: 'electrical', label: 'Electrical', query: 'Electrician', tint: 'amber', icon: 'bolt' },
  { id: 'garden', label: 'Garden', query: 'Gardener', tint: 'green', icon: 'leaf' },
  { id: 'painting', label: 'Painting', query: 'House painter', tint: 'pink', icon: 'roller' },
  { id: 'handyman', label: 'Handyman', query: 'Handyman', tint: 'purple', icon: 'wrench' },
  { id: 'all', label: 'All jobs', query: null, tint: 'plain', icon: 'dots' },
]

// Full job list (the "All jobs" screen). `keywords` are used to match
// free-text searches to a category (for labels and demo data).
export const CATEGORIES = [
  { id: 'window', label: 'Window Cleaners', single: 'Window cleaner', query: 'window cleaner', icon: 'window', color: '#32ade6', keywords: ['window', 'glass'] },
  { id: 'plumber', label: 'Plumbers', single: 'Plumber', query: 'plumber', icon: 'wrench', color: '#007aff', keywords: ['plumb', 'pipe', 'drain', 'leak', 'geyser'] },
  { id: 'electrician', label: 'Electricians', single: 'Electrician', query: 'electrician', icon: 'zap', color: '#ffcc00', keywords: ['electric', 'wiring', 'power'] },
  { id: 'gardener', label: 'Gardeners', single: 'Gardener', query: 'gardener', icon: 'leaf', color: '#34c759', keywords: ['garden', 'lawn', 'landscap', 'tree'] },
  { id: 'painter', label: 'Painters', single: 'Painter', query: 'house painter', icon: 'roller', color: '#ff2d55', keywords: ['paint'] },
  { id: 'cleaner', label: 'House Cleaners', single: 'House cleaner', query: 'house cleaning service', icon: 'sparkles', color: '#af52de', keywords: ['clean', 'maid', 'domestic'] },
  { id: 'handyman', label: 'Handymen', single: 'Handyman', query: 'handyman', icon: 'hammer', color: '#ff9500', keywords: ['handy', 'repair', 'fix'] },
  { id: 'locksmith', label: 'Locksmiths', single: 'Locksmith', query: 'locksmith', icon: 'key', color: '#a2845e', keywords: ['lock', 'key'] },
  { id: 'mechanic', label: 'Mechanics', single: 'Mechanic', query: 'car mechanic', icon: 'car', color: '#5856d6', keywords: ['mechanic', 'car', 'auto', 'tyre', 'tire'] },
  { id: 'roofer', label: 'Roofers', single: 'Roofer', query: 'roofer', icon: 'home', color: '#ff3b30', keywords: ['roof', 'gutter'] },
  { id: 'movers', label: 'Movers', single: 'Removal company', query: 'moving company', icon: 'truck', color: '#00c7be', keywords: ['move', 'mover', 'removal'] },
  { id: 'pest', label: 'Pest Control', single: 'Pest control', query: 'pest control', icon: 'bug', color: '#30b0c7', keywords: ['pest', 'termite', 'rat', 'insect'] },
]

export function matchCategory(text) {
  const q = text.toLowerCase()
  return CATEGORIES.find((c) => c.keywords.some((k) => q.includes(k))) ?? null
}
