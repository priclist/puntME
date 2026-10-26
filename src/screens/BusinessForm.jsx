import { useRef, useState } from 'react'
import { CATEGORIES, matchCategory } from '../data/categories.js'
import { api } from '../lib/api.js'
import { displayPhone, toListing } from '../lib/businesses.js'
import { locateMe, reverseGeocode } from '../lib/geo.js'
import { logoFromFile } from '../lib/image.js'
import { findGoogleBusiness, usingGoogle } from '../lib/places.js'
import { useLocalStorage } from '../lib/useLocalStorage.js'
import { Icon } from '../ui/icons.jsx'
import LocationSheet from '../ui/LocationSheet.jsx'
import { Avatar, OpenStatus, SourceBadge, Switch, SwitchRow } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

const DAYS = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [0, 'Sun'],
]
const slot = (days, open, close) => days.map((day) => ({ day, open, close }))
const HOUR_PRESETS = [
  { label: 'Weekdays 8–5', hours: slot([1, 2, 3, 4, 5], '08:00', '17:00') },
  { label: 'Mon–Sat 8–5', hours: slot([1, 2, 3, 4, 5, 6], '08:00', '17:00') },
  { label: 'Every day 7–7', hours: slot([0, 1, 2, 3, 4, 5, 6], '07:00', '19:00') },
]
const RADII = [5, 10, 25, 50, 100]

const EMPTY = {
  name: '',
  job: '',
  categoryId: null,
  customJob: false,
  description: '',
  logo: null,
  phone: '',
  whatsapp: true,
  email: '',
  website: '',
  area: null,
  radiusKm: 25,
  hours: [...slot([1, 2, 3, 4, 5], '08:00', '17:00'), ...slot([6], '08:00', '13:00')],
  googlePlaceId: null,
}

function fromBusiness(b) {
  const known = CATEGORIES.find((c) => c.id === b.categoryId && c.single === b.job)
  return {
    name: b.name,
    job: b.job,
    categoryId: b.categoryId,
    customJob: !known,
    description: b.description,
    logo: b.logo,
    phone: displayPhone(b.phone),
    whatsapp: b.whatsapp,
    email: b.email ?? '',
    website: b.website ?? '',
    area: { label: b.area, lat: b.lat, lng: b.lng, source: 'search' },
    radiusKm: b.radiusKm,
    hours: b.hours,
    googlePlaceId: b.googlePlaceId,
  }
}

const toBody = (d) => ({
  name: d.name,
  job: d.job,
  categoryId: d.categoryId,
  description: d.description,
  logo: d.logo,
  phone: d.phone,
  whatsapp: d.whatsapp,
  email: d.email,
  website: d.website,
  area: d.area?.label,
  lat: d.area?.lat,
  lng: d.area?.lng,
  radiusKm: d.radiusKm,
  hours: d.hours,
  googlePlaceId: d.googlePlaceId,
})

// What's missing on each step, in the words shown to the owner.
const CHECKS = [
  (d) => (d.name.trim().length < 2 ? 'Add your business name.' : d.job.trim().length < 2 ? 'Choose the job you do.' : null),
  (d) => (d.phone.replace(/\D/g, '').length < 9 ? 'Add a phone number customers can call.' : null),
  (d) => (!d.area ? 'Choose the area you work in.' : d.hours.length === 0 ? 'Add the days you work.' : null),
  () => null,
]
const STEPS = ['Your business', 'Contact', 'Where and when', 'Preview']

/* ---------- Step 1: the business ---------- */

function GoogleFinder({ coords, onPick }) {
  const [text, setText] = useState('')
  const [found, setFound] = useState({ status: 'idle', results: [], error: null })

  async function search(e) {
    e.preventDefault()
    if (text.trim().length < 2) return
    setFound({ status: 'loading', results: [], error: null })
    try {
      const results = await findGoogleBusiness(text.trim(), coords)
      setFound({ status: 'done', results, error: null })
    } catch (err) {
      setFound({ status: 'error', results: [], error: err.message })
    }
  }

  return (
    <div className="pm-googlefind">
      <div className="pm-stack-2">
        <span className="pm-title-15">Already on Google?</span>
        <span className="pm-meta">Find your Google Business Profile to fill this in for you.</span>
      </div>
      <form className="pm-field__row" role="search" onSubmit={search}>
        <input
          type="search"
          aria-label="Your business name on Google"
          placeholder="Business name and town"
          enterKeyHint="search"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="pm-btn pm-btn--tint" disabled={found.status === 'loading' || text.trim().length < 2}>
          {found.status === 'loading' ? 'Finding…' : 'Find'}
        </button>
      </form>
      {found.status === 'error' && <p className="pm-meta pm-error pm-m0">{found.error}</p>}
      {found.status === 'done' && found.results.length === 0 && <p className="pm-meta pm-m0">Nothing found on Google. Fill it in below instead.</p>}
      {found.results.length > 0 && (
        <div className="pm-card">
          {found.results.map((r) => (
            <button key={r.googlePlaceId} type="button" className="pm-detail pm-detail--button" onClick={() => onPick(r)}>
              <span className="pm-stack-2 pm-grow">
                <span className="pm-detail__main">{r.name}</span>
                <span className="pm-meta pm-ellipsis">{r.address}</span>
              </span>
              <span className="pm-textlink">Use</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LogoPicker({ draft, set }) {
  const input = useRef(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    try {
      set({ logo: await logoFromFile(file) })
    } catch (err) {
      showToast(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="pm-logopicker">
      <Avatar provider={{ name: draft.name || 'Your business', logo: draft.logo }} size="lg" />
      <div className="pm-stack-2 pm-grow">
        <span className="pm-title-15">Logo or photo</span>
        <span className="pm-meta">Optional. Shows next to your name.</span>
      </div>
      <input ref={input} type="file" accept="image/*" hidden onChange={onFile} />
      {draft.logo && (
        <button type="button" className="pm-iconbtn pm-iconbtn--sm" aria-label="Remove logo" onClick={() => set({ logo: null })}>
          <Icon name="trash" size={18} />
        </button>
      )}
      <button type="button" className="pm-btn pm-btn--soft" onClick={() => input.current.click()} disabled={busy}>
        <Icon name="camera" size={17} />
        {busy ? 'Adding…' : draft.logo ? 'Change' : 'Add'}
      </button>
    </div>
  )
}

function BasicsSection({ draft, set, showGoogle, coords, onGooglePick }) {
  return (
    <div className="pm-stack-18">
      {showGoogle && <GoogleFinder coords={coords} onPick={onGooglePick} />}

      <div className="pm-card">
        <label className="pm-input">
          <span className="pm-input__label">Business name</span>
          <input
            autoComplete="organization"
            placeholder="e.g. Sipho’s Plumbing"
            enterKeyHint="next"
            maxLength={80}
            value={draft.name}
            onChange={(e) => set({ name: e.target.value })}
          />
        </label>
      </div>

      <fieldset className="pm-fieldset">
        <legend className="pm-title-15">What job do you do?</legend>
        <div className="pm-chips">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`pm-chip ${!draft.customJob && draft.categoryId === c.id ? 'is-on' : ''}`}
              aria-pressed={!draft.customJob && draft.categoryId === c.id}
              onClick={() => set({ categoryId: c.id, job: c.single, customJob: false })}
            >
              {c.single}
            </button>
          ))}
          <button
            type="button"
            className={`pm-chip ${draft.customJob ? 'is-on' : ''}`}
            aria-pressed={draft.customJob}
            onClick={() => set({ customJob: true, job: '', categoryId: null })}
          >
            Something else
          </button>
        </div>
        {draft.customJob && (
          <div className="pm-card">
            <label className="pm-input">
              <span className="pm-input__label">Your job</span>
              <input
                autoFocus
                placeholder="e.g. Dog groomer, Tiler, Tutor"
                maxLength={60}
                value={draft.job}
                onChange={(e) => set({ job: e.target.value, categoryId: matchCategory(e.target.value)?.id ?? null })}
              />
            </label>
          </div>
        )}
      </fieldset>

      <div className="pm-card">
        <label className="pm-input">
          <span className="pm-input__label">
            About your business <span className="pm-muted">(optional)</span>
          </span>
          <textarea
            rows={4}
            maxLength={600}
            placeholder="What you do, how long you’ve done it, and what makes you good at it."
            value={draft.description}
            onChange={(e) => set({ description: e.target.value })}
          />
          <span className="pm-input__count">{draft.description.length}/600</span>
        </label>
      </div>

      <LogoPicker draft={draft} set={set} />
    </div>
  )
}

/* ---------- Step 2: contact ---------- */

function ContactSection({ draft, set }) {
  return (
    <div className="pm-stack-12">
      <div className="pm-card">
        <label className="pm-input">
          <span className="pm-input__label">Phone number</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="082 123 4567"
            enterKeyHint="next"
            value={draft.phone}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </label>
        <SwitchRow
          icon="chat"
          title="This number has WhatsApp"
          note="Customers get a WhatsApp button"
          checked={draft.whatsapp}
          onChange={(whatsapp) => set({ whatsapp })}
        />
      </div>
      <div className="pm-card">
        <label className="pm-input">
          <span className="pm-input__label">
            Email <span className="pm-muted">(optional)</span>
          </span>
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            enterKeyHint="next"
            value={draft.email}
            onChange={(e) => set({ email: e.target.value })}
          />
        </label>
        <label className="pm-input">
          <span className="pm-input__label">
            Website or Facebook page <span className="pm-muted">(optional)</span>
          </span>
          <input
            type="url"
            inputMode="url"
            autoComplete="url"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="www.yourbusiness.co.za"
            enterKeyHint="done"
            value={draft.website}
            onChange={(e) => set({ website: e.target.value })}
          />
        </label>
      </div>
      <p className="pm-meta pm-m0 pm-pad-x-4">Your number is shown to customers so they can call you. Quote requests also arrive in PuntMe.</p>
    </div>
  )
}

/* ---------- Step 3: where and when ---------- */

function HoursEditor({ hours, onChange }) {
  const byDay = new Map(hours.map((h) => [h.day, h]))
  const setDay = (day, value) => onChange([...hours.filter((h) => h.day !== day), ...(value ? [value] : [])].sort((a, b) => a.day - b.day))

  return (
    <div className="pm-stack-10">
      <div className="pm-hscroll pm-hscroll--flush">
        {HOUR_PRESETS.map((p) => (
          <button key={p.label} type="button" className="pm-quick" onClick={() => onChange(p.hours)}>
            {p.label}
          </button>
        ))}
      </div>
      <div className="pm-card">
        {DAYS.map(([day, label]) => {
          const h = byDay.get(day)
          return (
            <div key={day} className={`pm-dayrow ${h ? '' : 'is-closed'}`}>
              <span className="pm-dayrow__day">{label}</span>
              {h ? (
                <span className="pm-dayrow__times">
                  <input type="time" aria-label={`${label} opens`} value={h.open} onChange={(e) => setDay(day, { ...h, open: e.target.value })} />
                  <span className="pm-muted" aria-hidden="true">–</span>
                  <input type="time" aria-label={`${label} closes`} value={h.close} onChange={(e) => setDay(day, { ...h, close: e.target.value })} />
                </span>
              ) : (
                <span className="pm-dayrow__times pm-meta">Closed</span>
              )}
              <Switch
                checked={Boolean(h)}
                label={`Open on ${label}`}
                onChange={(on) => setDay(day, on ? { day, open: '08:00', close: '17:00' } : null)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

function AreaSection({ draft, set, onOpenArea }) {
  return (
    <div className="pm-stack-18">
      <div className="pm-stack-10">
        <span className="pm-title-15 pm-pad-x-4">Where do you work from?</span>
        <div className="pm-card">
          <button type="button" className="pm-detail pm-detail--button" onClick={onOpenArea}>
            <Icon name="pin" size={20} className={draft.area ? 'pm-accent' : 'pm-muted'} />
            <span className="pm-stack-2 pm-grow">
              <span className="pm-meta">Suburb or town</span>
              <span className="pm-detail__main">{draft.area?.label ?? 'Choose your area'}</span>
            </span>
            <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
          </button>
        </div>
        <p className="pm-meta pm-m0 pm-pad-x-4">Only the suburb is shown, never your street address.</p>
      </div>

      <fieldset className="pm-fieldset">
        <legend className="pm-title-15">How far do you travel for work?</legend>
        <div className="pm-chips">
          {RADII.map((km) => (
            <button
              key={km}
              type="button"
              className={`pm-chip ${draft.radiusKm === km ? 'is-on' : ''}`}
              aria-pressed={draft.radiusKm === km}
              onClick={() => set({ radiusKm: km })}
            >
              {km} km
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="pm-fieldset">
        <legend className="pm-title-15">When are you open?</legend>
        <HoursEditor hours={draft.hours} onChange={(hours) => set({ hours })} />
      </fieldset>
    </div>
  )
}

/* ---------- Step 4: preview ---------- */

function Preview({ draft }) {
  const listing = toListing(
    {
      ...toBody(draft),
      id: 'preview',
      phone: draft.phone,
      area: draft.area?.label ?? '',
      lat: draft.area?.lat ?? 0,
      lng: draft.area?.lng ?? 0,
      distanceKm: null,
    },
    null,
  )
  return (
    <div className="pm-stack-12">
      <p className="pm-meta pm-m0 pm-pad-x-4">This is how people searching for {draft.job.toLowerCase() || 'your job'} will see you.</p>
      <div className="pm-listcard pm-listcard--preview">
        <span className="pm-listcard__main">
          <Avatar provider={listing} />
          <span className="pm-listcard__text">
            <span className="pm-name-row">
              <span className="pm-name">{listing.name}</span>
              <SourceBadge provider={listing} />
            </span>
            <span className="pm-meta">
              {listing.category} · {draft.area?.label.split(',')[0]}
            </span>
            <span className="pm-rating-row">
              <span className="pm-meta">New on PuntMe</span>
              <OpenStatus provider={listing} />
            </span>
          </span>
        </span>
      </div>
      <ul className="pm-card pm-checklist">
        <li>
          <Icon name="phone" size={18} className="pm-accent" />
          Customers can call {draft.whatsapp ? 'or WhatsApp ' : ''}you on {draft.phone}
        </li>
        <li>
          <Icon name="inbox" size={18} className="pm-accent" />
          Quote requests arrive in PuntMe and as a notification
        </li>
        <li>
          <Icon name="pin" size={18} className="pm-accent" />
          You show up for people within {draft.radiusKm} km of {draft.area?.label.split(',')[0]}
        </li>
      </ul>
      <p className="pm-meta pm-m0 pm-pad-x-4">You can change anything, pause or remove your listing at any time from your profile.</p>
    </div>
  )
}

/* ---------- The form ---------- */

export default function BusinessForm({ business, coords, onBack, onSaved }) {
  const editing = Boolean(business)
  // A new listing is kept as a draft on the phone until it's published.
  const [savedDraft, setSavedDraft] = useLocalStorage('puntme:bizdraft', null)
  const [draft, setDraftState] = useState(() => (editing ? fromBusiness(business) : { ...EMPTY, ...savedDraft }))
  const [step, setStep] = useState(0)
  const [areaOpen, setAreaOpen] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState(null)
  const [state, setState] = useState({ busy: false, error: null })
  const scroller = useRef(null)

  function set(change) {
    setDraftState((d) => {
      const next = { ...d, ...change }
      if (!editing) setSavedDraft(next)
      return next
    })
    setState((s) => (s.error ? { ...s, error: null } : s))
  }

  async function applyGoogle(r) {
    const category = matchCategory(`${r.job} ${r.name}`)
    set({
      name: r.name,
      googlePlaceId: r.googlePlaceId,
      phone: r.phone ? displayPhone(r.phone.replace(/[^\d+]/g, '')) : draft.phone,
      website: r.website || draft.website,
      hours: r.hours.length ? r.hours : draft.hours,
      ...(category ? { categoryId: category.id, job: category.single, customJob: false } : {}),
    })
    showToast('Filled in from Google. Check that it’s all right.')
    if (r.lat != null) {
      const label = await reverseGeocode({ lat: r.lat, lng: r.lng })
      set({ area: { label: label ?? r.address.split(',').slice(-3, -2)[0]?.trim() ?? r.address, lat: r.lat, lng: r.lng, source: 'search' } })
    }
  }

  function locate() {
    setLocating(true)
    setLocateError(null)
    locateMe()
      .then((p) => {
        set({ area: p })
        setAreaOpen(false)
      })
      .catch((err) => setLocateError(err.message))
      .finally(() => setLocating(false))
  }

  function goTo(next) {
    setStep(next)
    scroller.current?.scrollTo({ top: 0 })
  }

  function next() {
    const problem = CHECKS[step](draft)
    if (problem) return setState({ busy: false, error: problem })
    if (step < STEPS.length - 1) goTo(step + 1)
    else save()
  }

  function back() {
    if (editing || step === 0) onBack()
    else goTo(step - 1)
  }

  async function save() {
    const problem = CHECKS.map((check) => check(draft)).find(Boolean)
    if (problem) return setState({ busy: false, error: problem })
    setState({ busy: true, error: null })
    try {
      const { business: saved } = editing
        ? await api(`/businesses/${business.id}`, { method: 'PATCH', body: toBody(draft) })
        : await api('/businesses', { method: 'POST', body: { ...toBody(draft), status: 'live' } })
      if (!editing) setSavedDraft(null)
      navigator.vibrate?.(12)
      onSaved(saved, { created: !editing })
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  const sections = {
    0: <BasicsSection draft={draft} set={set} showGoogle={usingGoogle && !editing} coords={coords} onGooglePick={applyGoogle} />,
    1: <ContactSection draft={draft} set={set} />,
    2: <AreaSection draft={draft} set={set} onOpenArea={() => setAreaOpen(true)} />,
    3: <Preview draft={draft} />,
  }

  return (
    <div className="pm-screen">
      <div className="pm-formhead">
        <div className="pm-formhead__row">
          <button type="button" className="pm-iconbtn" aria-label={step === 0 || editing ? 'Close' : 'Back'} onClick={back}>
            <Icon name={step === 0 || editing ? 'close' : 'back'} size={22} strokeWidth={2} />
          </button>
          <span className="pm-title-15">{editing ? 'Edit business' : 'Add your business'}</span>
          <span className="pm-formhead__spacer" />
        </div>
        {!editing && (
          <div className="pm-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label="Progress">
            {STEPS.map((s, i) => (
              <span key={s} className={`pm-progress__seg ${i <= step ? 'is-done' : ''}`} />
            ))}
          </div>
        )}
      </div>

      <main ref={scroller} className="pm-scroll pm-scroll--form">
        {editing ? (
          STEPS.slice(0, 3).map((title, i) => (
            <section key={title} className="pm-stack-12" aria-label={title}>
              <h2 className="pm-h2">{title}</h2>
              {sections[i]}
            </section>
          ))
        ) : (
          <section key={step} className="pm-stack-18 pm-step" aria-labelledby="step-title">
            <div className="pm-stack-4">
              <span className="pm-meta">
                Step {step + 1} of {STEPS.length}
              </span>
              <h1 id="step-title" className="pm-hero pm-hero--page">
                {STEPS[step]}
              </h1>
            </div>
            {sections[step]}
          </section>
        )}
      </main>

      <div className="pm-bottombar pm-bottombar--stack">
        {state.error && (
          <p className="pm-meta pm-error pm-m0" role="alert">
            {state.error}
          </p>
        )}
        <div className="pm-bottombar__row">
          {!editing && step > 0 && (
            <button type="button" className="pm-btn pm-btn--soft pm-btn--big pm-btn--grow-0" onClick={back}>
              Back
            </button>
          )}
          <button type="button" className="pm-btn pm-btn--primary pm-btn--big" onClick={editing ? save : next} disabled={state.busy}>
            {state.busy ? 'Saving…' : editing ? 'Save changes' : step === STEPS.length - 1 ? 'Publish my business' : 'Next'}
          </button>
        </div>
      </div>

      <LocationSheet
        open={areaOpen}
        title="Where you work"
        hint="Customers within your travel distance of this area will find you."
        chosen={(label) => `You work from ${label}.`}
        place={draft.area}
        locating={locating}
        locateError={locateError}
        onLocate={locate}
        onPick={(p) => {
          set({ area: { label: p.label, lat: p.lat, lng: p.lng, source: 'search' } })
          setAreaOpen(false)
        }}
        onClose={() => setAreaOpen(false)}
      />
    </div>
  )
}
