import { useState } from 'react'
import { initials } from '../lib/format.js'
import { usePush } from '../lib/push.js'
import { useInstall } from '../lib/pwa.js'
import { Icon } from '../ui/icons.jsx'
import NotificationSettings from '../ui/NotificationSettings.jsx'
import { Avatar } from '../ui/pieces.jsx'
import { showToast } from '../ui/Toast.jsx'

function AuthForm({ account, onDone }) {
  const [mode, setMode] = useState('register')
  const [fields, setFields] = useState({ name: '', email: '', password: '' })
  const [state, setState] = useState({ busy: false, error: null })
  const set = (key) => (e) => setFields((f) => ({ ...f, [key]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    setState({ busy: true, error: null })
    try {
      const data = await account.signIn(mode, mode === 'register' ? fields : { email: fields.email, password: fields.password })
      showToast(mode === 'register' ? `Welcome to PuntMe, ${data.user.name.split(' ')[0]}` : `Welcome back, ${data.user.name.split(' ')[0]}`)
      onDone(data)
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  return (
    <form className="pm-form" onSubmit={submit}>
      <div className="pm-segmented" role="tablist" aria-label="Account">
        {[
          ['register', 'Create account'],
          ['login', 'Sign in'],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={mode === id}
            className={`pm-segmented__btn ${mode === id ? 'is-on' : ''}`}
            onClick={() => {
              setMode(id)
              setState({ busy: false, error: null })
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pm-card">
        {mode === 'register' && (
          <label className="pm-input">
            <span className="pm-input__label">Your name</span>
            <input required minLength={2} autoComplete="name" enterKeyHint="next" value={fields.name} onChange={set('name')} />
          </label>
        )}
        <label className="pm-input">
          <span className="pm-input__label">Email</span>
          <input
            required
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck="false"
            enterKeyHint="next"
            value={fields.email}
            onChange={set('email')}
          />
        </label>
        <label className="pm-input">
          <span className="pm-input__label">Password</span>
          <input
            required
            type="password"
            minLength={mode === 'register' ? 8 : undefined}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            enterKeyHint="go"
            placeholder={mode === 'register' ? 'At least 8 characters' : undefined}
            value={fields.password}
            onChange={set('password')}
          />
        </label>
      </div>

      {state.error && (
        <p className="pm-meta pm-error pm-m0 pm-pad-x-4" role="alert">
          {state.error}
        </p>
      )}

      <button type="submit" className="pm-btn pm-btn--primary pm-btn--big pm-btn--block" disabled={state.busy}>
        {state.busy ? 'One moment…' : mode === 'register' ? 'Create account' : 'Sign in'}
      </button>
    </form>
  )
}

function BusinessRow({ business: b, onOpen }) {
  return (
    <button type="button" className="pm-bizrow" onClick={() => onOpen(b.id)}>
      <Avatar provider={b} />
      <span className="pm-stack-4 pm-grow">
        <span className="pm-name">{b.name}</span>
        <span className="pm-meta pm-ellipsis">
          {b.job} · {b.area.split(',')[0]}
        </span>
        <span className="pm-bizrow__stats">
          <span className={`pm-pill ${b.status === 'live' ? 'pm-pill--live' : ''}`}>{b.status === 'live' ? 'Live' : 'Paused'}</span>
          <span className="pm-meta">
            {b.views} view{b.views === 1 ? '' : 's'} · {b.quoteCount} request{b.quoteCount === 1 ? '' : 's'}
          </span>
        </span>
      </span>
      {b.unread > 0 && <span className="pm-count">{b.unread}</span>}
      <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
    </button>
  )
}

function AccountSection({ account }) {
  const [editing, setEditing] = useState(null) // 'name' | 'delete'
  const [value, setValue] = useState('')
  const [state, setState] = useState({ busy: false, error: null })

  function open(kind) {
    setEditing(kind)
    setValue(kind === 'name' ? account.user.name : '')
    setState({ busy: false, error: null })
  }

  async function save(e) {
    e.preventDefault()
    setState({ busy: true, error: null })
    try {
      if (editing === 'name') {
        await account.rename(value)
        showToast('Name updated')
      } else {
        await account.deleteAccount(value)
        showToast('Your account and businesses were deleted')
      }
      setEditing(null)
    } catch (err) {
      setState({ busy: false, error: err.message })
    }
  }

  return (
    <section className="pm-stack-12" aria-labelledby="account-heading">
      <h2 id="account-heading" className="pm-h2">Account</h2>
      <div className="pm-card">
        {editing === 'name' ? (
          <form className="pm-field" onSubmit={save}>
            <label htmlFor="name-input" className="pm-meta">Your name</label>
            <div className="pm-field__row">
              <input id="name-input" autoFocus autoComplete="name" value={value} onChange={(e) => setValue(e.target.value)} />
              <button type="submit" className="pm-btn pm-btn--primary" disabled={state.busy || value.trim().length < 2}>
                Save
              </button>
            </div>
            {state.error && <p className="pm-meta pm-error pm-m0">{state.error}</p>}
          </form>
        ) : (
          <button type="button" className="pm-detail pm-detail--button" onClick={() => open('name')}>
            <Icon name="user" size={20} className="pm-muted" />
            <span className="pm-stack-2 pm-grow">
              <span className="pm-meta">Name</span>
              <span className="pm-detail__main">{account.user.name}</span>
            </span>
            <Icon name="pencil" size={18} className="pm-muted" />
          </button>
        )}
        <div className="pm-detail">
          <Icon name="mail" size={20} className="pm-muted" />
          <span className="pm-stack-2 pm-grow">
            <span className="pm-meta">Email</span>
            <span className="pm-detail__main pm-ellipsis">{account.user.email}</span>
          </span>
        </div>
        <button type="button" className="pm-detail pm-detail--button" onClick={account.signOut}>
          <Icon name="logout" size={20} className="pm-muted" />
          <span className="pm-detail__main pm-grow">Sign out</span>
        </button>
        {editing === 'delete' ? (
          <form className="pm-field" onSubmit={save}>
            <label htmlFor="delete-input" className="pm-meta">
              This deletes your account, your businesses and their quote requests. Enter your password to confirm.
            </label>
            <div className="pm-field__row">
              <input
                id="delete-input"
                type="password"
                autoFocus
                autoComplete="current-password"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
              <button type="submit" className="pm-btn pm-btn--danger" disabled={state.busy || !value}>
                Delete
              </button>
            </div>
            {state.error && <p className="pm-meta pm-error pm-m0">{state.error}</p>}
            <button type="button" className="pm-textlink" onClick={() => setEditing(null)}>
              Keep my account
            </button>
          </form>
        ) : (
          <button type="button" className="pm-detail pm-detail--button" onClick={() => open('delete')}>
            <Icon name="trash" size={20} className="pm-danger" />
            <span className="pm-detail__main pm-danger pm-grow">Delete account</span>
          </button>
        )}
      </div>
    </section>
  )
}

export default function Profile({ account, onBack, onAddBusiness, onOpenBusiness, onAuthed, suggestion, onShowInstall }) {
  const push = usePush()
  const install = useInstall()
  const user = account.user
  const businesses = account.businesses

  async function installApp() {
    if (install.canPrompt) {
      if (await install.install()) showToast('PuntMe is on your home screen')
    } else onShowInstall()
  }

  return (
    <div className="pm-screen">
      <div className="pm-topbar">
        <button type="button" className="pm-iconbtn" aria-label="Back" onClick={onBack}>
          <Icon name="back" size={22} strokeWidth={2} />
        </button>
      </div>

      <main className="pm-scroll pm-scroll--page">
        {user ? (
          <header className="pm-profilehead">
            <span className="pm-profilehead__avatar" aria-hidden="true">
              {initials(user.name)}
            </span>
            <div className="pm-stack-2">
              <h1 className="pm-hero pm-hero--page">{user.name}</h1>
              <p className="pm-meta pm-m0 pm-ellipsis">{user.email}</p>
            </div>
          </header>
        ) : (
          <header className="pm-stack-4">
            <h1 className="pm-hero pm-hero--page">Profile</h1>
            <p className="pm-meta pm-m0">Add your business, follow jobs and get notifications</p>
          </header>
        )}

        {account.status === 'loading' && (
          <div className="pm-listcard pm-skeleton" aria-hidden="true">
            <span className="pm-skel pm-skel--avatar" />
            <span className="pm-stack-4 pm-grow">
              <span className="pm-skel" style={{ width: '50%' }} />
              <span className="pm-skel" style={{ width: '70%' }} />
            </span>
          </div>
        )}

        {account.status === 'error' && (
          <div className="pm-empty">
            <p className="pm-title-15">Couldn’t load your profile</p>
            <p className="pm-meta">Check your connection and try again.</p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={account.refresh}>
              Try again
            </button>
          </div>
        )}

        {account.status === 'signedout' && (
          <>
            <div className="pm-pitch">
              <span className="pm-pitch__icon" aria-hidden="true">
                <Icon name="store" size={26} />
              </span>
              <div className="pm-stack-4">
                <h2 className="pm-h3">Put your business on PuntMe</h2>
                <p className="pm-meta pm-m0">
                  People nearby search for your kind of work every day. Add your business free and get quote requests straight to
                  your phone.
                </p>
              </div>
            </div>
            <AuthForm account={account} onDone={onAuthed} />
          </>
        )}

        {account.status === 'ready' && (
          <section className="pm-stack-12" aria-labelledby="biz-heading">
            <div className="pm-row-between">
              <h2 id="biz-heading" className="pm-h2">{businesses.length > 1 ? 'Your businesses' : 'Your business'}</h2>
              {businesses.length > 0 && businesses.length < 5 && (
                <button type="button" className="pm-textlink" onClick={onAddBusiness}>
                  Add another
                </button>
              )}
            </div>
            {businesses.length === 0 ? (
              <button type="button" className="pm-addbiz" onClick={onAddBusiness}>
                <span className="pm-addbiz__icon" aria-hidden="true">
                  <Icon name="plus" size={24} strokeWidth={2.2} />
                </span>
                <span className="pm-stack-2 pm-grow">
                  <span className="pm-title-15">Add your business</span>
                  <span className="pm-meta">Free. Takes about two minutes.</span>
                </span>
                <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
              </button>
            ) : (
              <div className="pm-card">
                {businesses.map((b) => (
                  <BusinessRow key={b.id} business={b} onOpen={onOpenBusiness} />
                ))}
              </div>
            )}
          </section>
        )}

        {account.status !== 'loading' && (
          <NotificationSettings push={push} hasBusiness={businesses.length > 0} suggestion={suggestion} onShowInstall={onShowInstall} />
        )}

        {install.available && (
          <section className="pm-stack-12" aria-labelledby="app-heading">
            <h2 id="app-heading" className="pm-h2">App</h2>
            <div className="pm-card">
              <button type="button" className="pm-detail pm-detail--button" onClick={installApp}>
                <Icon name="download" size={20} className="pm-accent" />
                <span className="pm-stack-2 pm-grow">
                  <span className="pm-detail__main">Install PuntMe</span>
                  <span className="pm-meta">Opens full screen from your home screen, even with no signal</span>
                </span>
                <Icon name="chevronRight" size={18} strokeWidth={2} className="pm-muted" />
              </button>
            </div>
          </section>
        )}

        {account.status === 'ready' && <AccountSection account={account} />}

        <p className="pm-footnote">Your account is only used for your PuntMe business and notifications.</p>
      </main>
    </div>
  )
}
