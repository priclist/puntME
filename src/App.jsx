import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { matchCategory } from './data/categories.js'
import { reverseGeocode } from './lib/geo.js'
import { searchProviders, usingGoogle } from './lib/places.js'
import { useLocalStorage } from './lib/useLocalStorage.js'
import { SAVED_KEY, loadLegacySaved, toSavedRef, useDropLegacySaved } from './lib/saved.js'
import Discover from './screens/Discover.jsx'
import Results from './screens/Results.jsx'
import Provider from './screens/Provider.jsx'
import Saved from './screens/Saved.jsx'
import Settings from './screens/Settings.jsx'
import LocationSheet from './ui/LocationSheet.jsx'
import Toast, { showToast } from './ui/Toast.jsx'

const IDLE = { status: 'idle', results: [], source: null, error: null }
const MAX_RECENT = 6

// Best three for "Top rated near you": highest rated, more reviews breaks ties.
function topPicks(results) {
  return results
    .filter((p) => p.rating != null)
    .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    .slice(0, 3)
}

// "Window cleaners" for a known job, otherwise the search text as typed.
function jobLabel(job) {
  const category = matchCategory(job)
  const text = category ? category.label.toLowerCase() : job.trim()
  return text.charAt(0).toUpperCase() + text.slice(1)
}

// Earlier versions kept the area as plain text.
function loadLegacyArea() {
  try {
    const area = localStorage.getItem('puntme:area')
    return area ? { label: area, lat: null, lng: null, source: 'search' } : null
  } catch {
    return null
  }
}

const placeKey = (p) => (p ? `${p.label}|${p.lat}|${p.lng}` : '')

export default function App() {
  // Screens form a stack that mirrors browser history, so the phone's back
  // button / back swipe goes back a screen. Tabs live at the bottom (depth 1).
  const [stack, setStack] = useState([{ name: 'discover' }])
  const [navDir, setNavDir] = useState('none')
  const stackRef = useRef(stack)
  stackRef.current = stack
  const scrollMemo = useRef({})
  const screen = stack[stack.length - 1]

  const [text, setText] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [search, setSearch] = useState(IDLE)
  const [filters, setFilters] = useState({ open: true })
  const [sort, setSort] = useState('rating')
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, loadLegacySaved)
  const [place, setPlace] = useLocalStorage('puntme:place', loadLegacyArea)
  const [recent, setRecent] = useLocalStorage('puntme:recent', [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [lastJob, setLastJob] = useLocalStorage('puntme:lastJob', 'Window cleaner')
  const [recs, setRecs] = useState({ status: 'loading', items: [] })
  const requestId = useRef(0)
  const lastJobRef = useRef(lastJob)
  lastJobRef.current = lastJob
  const placeRef = useRef(place)
  placeRef.current = place
  const savedRef = useRef(saved)
  savedRef.current = saved

  useDropLegacySaved(setSaved)
  const savedIds = useMemo(() => new Set(saved.map((ref) => ref.id)), [saved])
  const coords = place?.lat != null ? { lat: place.lat, lng: place.lng } : null

  /* ---------- Navigation ---------- */

  useEffect(() => {
    window.history.replaceState({ depth: 1 }, '')
    const onPop = (e) => {
      const depth = Math.max(1, e.state?.depth ?? 1)
      setSheetOpen(false)
      if (depth < stackRef.current.length) {
        setNavDir('pop')
        setStack((s) => s.slice(0, depth))
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Coming back to a screen puts it where the user left it.
  useLayoutEffect(() => {
    const el = document.querySelector('.pm-scroll')
    if (el) el.scrollTop = navDir === 'pop' ? (scrollMemo.current[stack.length] ?? 0) : 0
  }, [stack, navDir])

  function push(next) {
    const depth = stackRef.current.length
    scrollMemo.current[depth] = document.querySelector('.pm-scroll')?.scrollTop ?? 0
    setNavDir('push')
    setStack((s) => [...s, next])
    window.history.pushState({ depth: depth + 1 }, '')
  }

  function replaceTop(next) {
    setStack((s) => [...s.slice(0, -1), next])
  }

  function goBack() {
    if (stackRef.current.length > 1) window.history.back()
    else navigate('discover')
  }

  function navigate(name) {
    scrollMemo.current = {}
    setNavDir('none')
    setStack([{ name }])
  }

  /* ---------- Searching ---------- */

  // "Top rated near you" loads on open and when the area changes. After a
  // search it's refreshed from that search's results instead (see runSearch).
  const currentPlaceKey = placeKey(place)
  useEffect(() => {
    let cancelled = false
    setRecs((r) => ({ ...r, status: 'loading' }))
    searchProviders({ query: lastJobRef.current, place: placeRef.current })
      .then(({ results }) => !cancelled && setRecs({ status: 'done', items: topPicks(results) }))
      .catch(() => !cancelled && setRecs({ status: 'error', items: [] }))
    return () => {
      cancelled = true
    }
  }, [currentPlaceKey])

  async function runSearch(term) {
    const q = term.trim()
    if (!q) return
    setText(q)
    setLastQuery(q)
    setRecent((r) => [q, ...r.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, MAX_RECENT))
    if (stackRef.current.at(-1).name === 'results') replaceTop({ name: 'results' })
    else push({ name: 'results' })

    const id = ++requestId.current
    setSearch((s) => ({ ...s, status: 'loading', error: null }))
    try {
      const { results, source } = await searchProviders({ query: q, place: placeRef.current })
      if (id !== requestId.current) return
      setSearch({ status: 'done', results, source, error: null })
      if (results.length > 0) {
        setLastJob(q)
        setRecs({ status: 'done', items: topPicks(results) })
      }
    } catch (err) {
      if (id === requestId.current) {
        setSearch({ status: 'error', results: [], source: null, error: err?.message || 'Something went wrong.' })
      }
    }
  }

  // Open the search screen with an empty box and the full job list.
  function startSearch() {
    requestId.current++
    setText('')
    setLastQuery('')
    setSearch(IDLE)
    push({ name: 'results', focus: true })
  }

  /* ---------- Area ---------- */

  function changePlace(next) {
    placeRef.current = next
    setPlace(next)
    setSheetOpen(false)
    // Results on screen are for the old area, so search again.
    if (lastQuery && stackRef.current.some((s) => s.name === 'results')) runSearch(lastQuery)
  }

  function locate() {
    if (!navigator.geolocation) {
      setLocateError('Location is not available on this device.')
      return
    }
    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        const label = await reverseGeocode(at)
        setLocating(false)
        changePlace({ label: label ?? 'Your location', ...at, source: 'gps' })
      },
      (err) => {
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? 'Location is turned off for PuntMe. Allow it in your browser settings, or type your area instead.'
            : 'PuntMe couldn’t get your location. Try again, or type your area instead.',
        )
        setLocating(false)
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000 },
    )
  }

  function openSheet() {
    setLocateError(null)
    setSheetOpen(true)
  }

  /* ---------- Saved ---------- */

  const toggleSave = useCallback(
    (p) => {
      const wasSaved = savedRef.current.some((x) => x.id === p.id)
      setSaved((list) => (wasSaved ? list.filter((x) => x.id !== p.id) : [toSavedRef(p), ...list.filter((x) => x.id !== p.id)]))
      showToast(wasSaved ? `Removed ${p.name} from saved` : `Saved ${p.name}`)
      navigator.vibrate?.(8)
    },
    [setSaved],
  )
  const removeSaved = useCallback((id) => setSaved((list) => list.filter((x) => x.id !== id)), [setSaved])

  function clearSaved() {
    if (window.confirm(`Remove all ${saved.length} saved people?`)) setSaved([])
  }

  /* ---------- Connection ---------- */

  useEffect(() => {
    const offline = () => showToast('You’re offline. PuntMe will search again when you’re back.')
    const online = () => showToast('Back online')
    window.addEventListener('offline', offline)
    window.addEventListener('online', online)
    return () => {
      window.removeEventListener('offline', offline)
      window.removeEventListener('online', online)
    }
  }, [])

  const visible = useMemo(() => {
    let list = search.results.filter((p) => {
      if (filters.open && !p.openNow) return false
      if (filters.rated && !(p.rating >= 4.5)) return false
      if (filters.near && !(p.distanceKm <= 5)) return false
      return true
    })
    if (sort === 'rating') {
      list = [...list].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || b.reviewCount - a.reviewCount)
    } else if (sort === 'distance') {
      list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))
    }
    return list
  }, [search.results, filters, sort])

  const openProvider = useCallback((p) => push({ name: 'provider', provider: p }), [])

  const areaLabel = place?.label ?? 'Set your area'
  const hasDistance = search.results.some((p) => p.distanceKm != null)

  return (
    <>
      <div key={`${stack.length}:${screen.name}`} className={`pm-stage pm-stage--${navDir}`}>
        {renderScreen()}
      </div>
      <LocationSheet
        open={sheetOpen}
        place={place}
        locating={locating}
        locateError={locateError}
        onLocate={locate}
        onPick={changePlace}
        onClose={() => setSheetOpen(false)}
      />
      <Toast />
    </>
  )

  function renderScreen() {
    switch (screen.name) {
      case 'results':
        return (
          <Results
            text={text}
            onTextChange={setText}
            onSubmit={runSearch}
            onBack={goBack}
            autoFocus={Boolean(screen.focus)}
            lastQuery={lastQuery}
            jobTitle={lastQuery ? jobLabel(lastQuery) : ''}
            where={place ? ['near', place.source === 'gps' ? 'you' : place.label] : ['in', 'South Africa']}
            hasPlace={Boolean(place)}
            onSetArea={openSheet}
            recent={recent}
            onClearRecent={() => setRecent([])}
            status={search.status}
            error={search.error}
            source={search.source}
            results={visible}
            totalCount={search.results.length}
            filters={filters}
            onToggleFilter={(id) => setFilters((f) => ({ ...f, [id]: !f[id] }))}
            onClearFilters={() => setFilters({})}
            sort={sort}
            onSortChange={setSort}
            hasDistance={hasDistance}
            savedIds={savedIds}
            onOpenProvider={openProvider}
            onToggleSave={toggleSave}
            onRetry={() => runSearch(lastQuery)}
          />
        )
      case 'provider':
        return (
          <Provider
            provider={screen.provider}
            onBack={goBack}
            saved={savedIds.has(screen.provider.id)}
            onToggleSave={toggleSave}
          />
        )
      case 'saved':
        return (
          <Saved
            refs={saved}
            coords={coords}
            onOpenProvider={openProvider}
            onToggleSave={toggleSave}
            onRemove={removeSaved}
            onNavigate={navigate}
          />
        )
      case 'settings':
        return (
          <Settings
            place={place}
            onOpenSheet={openSheet}
            locating={locating}
            locateError={sheetOpen ? null : locateError}
            onLocate={locate}
            usingGoogle={usingGoogle}
            savedCount={saved.length}
            onClearSaved={clearSaved}
            onClearRecent={recent.length ? () => setRecent([]) : null}
            onNavigate={navigate}
          />
        )
      default:
        return (
          <Discover
            areaLabel={areaLabel}
            place={place}
            onChangeArea={openSheet}
            onStartSearch={startSearch}
            onSearch={runSearch}
            lastJob={lastJob}
            lastJobLabel={jobLabel(lastJob)}
            recs={recs}
            savedIds={savedIds}
            onOpenProvider={openProvider}
            onToggleSave={toggleSave}
            onNavigate={navigate}
            savedCount={saved.length}
          />
        )
    }
  }
}
