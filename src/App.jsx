import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { matchCategory } from './data/categories.js'
import { useAccount } from './lib/account.js'
import { PM_PREFIX, newOnPuntMe } from './lib/businesses.js'
import { locateMe } from './lib/geo.js'
import { getProvider, searchProviders, usingGoogle } from './lib/places.js'
import { resyncPush } from './lib/push.js'
import { useLocalStorage } from './lib/useLocalStorage.js'
import { SAVED_KEY, loadLegacySaved, toSavedRef, useDropLegacySaved } from './lib/saved.js'
import BusinessForm from './screens/BusinessForm.jsx'
import Discover from './screens/Discover.jsx'
import MyBusiness from './screens/MyBusiness.jsx'
import Profile from './screens/Profile.jsx'
import Results from './screens/Results.jsx'
import Provider from './screens/Provider.jsx'
import Saved from './screens/Saved.jsx'
import Settings from './screens/Settings.jsx'
import { Icon } from './ui/icons.jsx'
import InstallSheet from './ui/InstallSheet.jsx'
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

/* A PuntMe business opened from a link or notification (?b=…). */
function LinkedProvider({ id, coords, onBack, ...props }) {
  const [state, setState] = useState({ status: 'loading', provider: null })
  useEffect(() => {
    let cancelled = false
    getProvider(`${PM_PREFIX}${id}`, coords)
      .then((provider) => !cancelled && setState({ status: 'done', provider }))
      .catch((err) => !cancelled && setState({ status: 'error', error: err.message }))
    return () => {
      cancelled = true
    }
  }, [id, coords])

  if (state.provider) return <Provider provider={state.provider} onBack={onBack} {...props} saved={props.savedIds.has(state.provider.id)} />
  return (
    <div className="pm-screen">
      <div className="pm-topbar">
        <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
      </div>
      <main className="pm-scroll pm-scroll--page">
        {state.status === 'loading' ? (
          <div className="pm-listcard pm-skeleton" aria-hidden="true">
            <span className="pm-skel pm-skel--avatar" />
            <span className="pm-skel pm-grow" />
          </div>
        ) : (
          <div className="pm-empty">
            <p className="pm-title-15">Couldn’t open this business</p>
            <p className="pm-meta">{state.error}</p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={onBack}>
              Find someone else
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default function App() {
  // Screens form a stack that mirrors browser history, so the phone's back
  // button / back swipe goes back a screen. Tabs live at the bottom (depth 1).
  const [stack, setStack] = useState([{ name: 'discover' }])
  const [navDir, setNavDir] = useState('none')
  const stackRef = useRef(stack)
  stackRef.current = stack
  const scrollMemo = useRef({})
  const screen = stack[stack.length - 1]

  const account = useAccount()
  const accountRef = useRef(account)
  accountRef.current = account

  const [text, setText] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [search, setSearch] = useState(IDLE)
  const [filters, setFilters] = useState({ open: true })
  const [sort, setSort] = useState('rating')
  const [saved, setSaved] = useLocalStorage(SAVED_KEY, loadLegacySaved)
  const [place, setPlace] = useLocalStorage('puntme:place', loadLegacyArea)
  const [recent, setRecent] = useLocalStorage('puntme:recent', [])
  const [sheetOpen, setSheetOpen] = useState(false)
  const [installOpen, setInstallOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [lastJob, setLastJob] = useLocalStorage('puntme:lastJob', 'Window cleaner')
  const [recs, setRecs] = useState({ status: 'loading', items: [] })
  const [newOnPm, setNewOnPm] = useState([])
  const requestId = useRef(0)
  const lastJobRef = useRef(lastJob)
  lastJobRef.current = lastJob
  const placeRef = useRef(place)
  placeRef.current = place
  const savedRef = useRef(saved)
  savedRef.current = saved

  useDropLegacySaved(setSaved)
  const savedIds = useMemo(() => new Set(saved.map((ref) => ref.id)), [saved])
  const coords = useMemo(() => (place?.lat != null ? { lat: place.lat, lng: place.lng } : null), [place])

  /* ---------- Navigation ---------- */

  function push(next) {
    const depth = stackRef.current.length
    scrollMemo.current[depth] = document.querySelector('.pm-scroll')?.scrollTop ?? 0
    setNavDir('push')
    setStack((s) => [...s, next])
    window.history.pushState({ depth: depth + 1 }, '')
  }

  function replaceTop(next) {
    setNavDir('none')
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

  function openProfile() {
    push({ name: 'profile' })
  }

  // Signed in: straight to the form. Otherwise sign in first, then the form.
  function addBusiness() {
    push(accountRef.current.user ? { name: 'business-form' } : { name: 'profile', next: 'add' })
  }

  // Links from notifications, home screen shortcuts and shared pages.
  function openLink(url) {
    const params = new URL(url, window.location.origin).searchParams
    if (params.get('b')) push({ name: 'provider', linkId: params.get('b') })
    else if (params.get('quotes')) push({ name: 'business', bizId: params.get('quotes') })
    else if (params.has('profile')) openProfile()
    else if (params.get('go') === 'saved') navigate('saved')
    else if (params.get('go') === 'search') startSearch()
    else if (params.get('go') === 'add') addBusiness()
  }
  const openLinkRef = useRef(openLink)
  openLinkRef.current = openLink

  // Once per page load (effects run twice in development, and a second
  // replaceState would overwrite the screen a link just opened).
  const booted = useRef(false)
  useEffect(() => {
    if (!booted.current) {
      booted.current = true
      const link = window.location.search
      window.history.replaceState({ depth: 1 }, '', link ? window.location.pathname : undefined)
      if (link) openLinkRef.current(link)
    }

    const onPop = (e) => {
      const depth = Math.max(1, e.state?.depth ?? 1)
      setSheetOpen(false)
      setInstallOpen(false)
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

  /* ---------- Service worker: notifications and updates ---------- */

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e) => {
      const { type, url, payload } = e.data ?? {}
      if (type === 'navigate') openLinkRef.current(url)
      if (type === 'push') {
        accountRef.current.refresh()
        // The app is open, so say it here too, with a way to jump there.
        if (payload?.title) showToast(payload.title, payload.url ? { action: { label: 'View', onClick: () => openLinkRef.current(payload.url) } } : {})
      }
    }
    navigator.serviceWorker.addEventListener('message', onMessage)

    // A new version took over: offer a reload rather than forcing one.
    const hadController = Boolean(navigator.serviceWorker.controller)
    const onUpdate = () => hadController && showToast('PuntMe was updated', { action: { label: 'Reload', onClick: () => window.location.reload() } })
    navigator.serviceWorker.addEventListener('controllerchange', onUpdate)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      navigator.serviceWorker.removeEventListener('controllerchange', onUpdate)
    }
  }, [])

  // Quote requests must reach whoever is signed in on this phone now.
  const userId = account.user?.id ?? null
  const accountSettled = account.status !== 'loading'
  useEffect(() => {
    if (accountSettled) resyncPush()
  }, [userId, accountSettled])

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

  // "New on PuntMe": businesses that joined and work in this area.
  const businessCount = account.businesses.length
  useEffect(() => {
    let cancelled = false
    const p = placeRef.current
    newOnPuntMe(p?.lat != null ? { lat: p.lat, lng: p.lng } : null).then((items) => !cancelled && setNewOnPm(items))
    return () => {
      cancelled = true
    }
  }, [currentPlaceKey, businessCount])

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
    setLocating(true)
    setLocateError(null)
    locateMe()
      .then(changePlace)
      .catch((err) => setLocateError(err.message))
      .finally(() => setLocating(false))
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
    // Businesses on PuntMe take requests in the app, so they come first.
    if (sort !== 'distance') list = [...list.filter((p) => p.puntme), ...list.filter((p) => !p.puntme)]
    return list
  }, [search.results, filters, sort])

  const openProvider = useCallback((p) => push({ name: 'provider', provider: p }), [])

  const ownIds = useMemo(() => new Set(account.businesses.map((b) => `${PM_PREFIX}${b.id}`)), [account.businesses])
  const areaLabel = place?.label ?? 'Set your area'
  const hasDistance = search.results.some((p) => p.distanceKm != null)
  const suggestion = lastJob ? { query: lastJob, place } : null

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
      <InstallSheet open={installOpen} onClose={() => setInstallOpen(false)} />
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
            place={place}
            onShowInstall={() => setInstallOpen(true)}
          />
        )
      case 'provider':
        if (screen.linkId) {
          return (
            <LinkedProvider
              id={screen.linkId}
              coords={coords}
              onBack={goBack}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              isOwner={ownIds.has(`${PM_PREFIX}${screen.linkId}`)}
            />
          )
        }
        return (
          <Provider
            provider={screen.provider}
            onBack={goBack}
            saved={savedIds.has(screen.provider.id)}
            onToggleSave={toggleSave}
            isOwner={ownIds.has(screen.provider.id)}
          />
        )
      case 'profile':
        return (
          <Profile
            account={account}
            onBack={goBack}
            onAddBusiness={() => push({ name: 'business-form' })}
            onOpenBusiness={(bizId) => push({ name: 'business', bizId })}
            onAuthed={() => screen.next === 'add' && replaceTop({ name: 'business-form' })}
            suggestion={suggestion}
            onShowInstall={() => setInstallOpen(true)}
          />
        )
      case 'business':
        return (
          <MyBusiness
            key={screen.bizId}
            bizId={screen.bizId}
            account={account}
            justPublished={Boolean(screen.justPublished)}
            onBack={goBack}
            onEdit={(b) => push({ name: 'business-form', bizId: b.id })}
            onView={(listing) => push({ name: 'provider', provider: listing })}
            onShowProfile={openProfile}
          />
        )
      case 'business-form': {
        const business = screen.bizId ? account.businesses.find((b) => b.id === screen.bizId) : null
        if (!account.user) {
          // Signed out while here (or opened from a link): sign in first.
          return (
            <Profile
              account={account}
              onBack={goBack}
              onAddBusiness={() => {}}
              onOpenBusiness={() => {}}
              onAuthed={() => replaceTop({ name: 'business-form', bizId: screen.bizId })}
              suggestion={suggestion}
              onShowInstall={() => setInstallOpen(true)}
            />
          )
        }
        return (
          <BusinessForm
            key={screen.bizId ?? 'new'}
            business={business}
            coords={coords}
            onBack={goBack}
            onSaved={async (b, { created }) => {
              await account.refresh()
              if (created) replaceTop({ name: 'business', bizId: b.id, justPublished: true })
              else {
                showToast('Saved. Customers see the changes straight away.')
                goBack()
              }
            }}
          />
        )
      }
      case 'saved':
        return (
          <Saved
            refs={saved}
            coords={coords}
            onOpenProvider={openProvider}
            onToggleSave={toggleSave}
            onRemove={removeSaved}
            onNavigate={navigate}
            account={account}
            onOpenProfile={openProfile}
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
            account={account}
            onOpenProfile={openProfile}
            onAddBusiness={addBusiness}
            onShowInstall={() => setInstallOpen(true)}
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
            account={account}
            onOpenProfile={openProfile}
            onAddBusiness={addBusiness}
            newOnPm={newOnPm}
            onShowInstall={() => setInstallOpen(true)}
          />
        )
    }
  }
}
