import { useSavedProviders } from '../lib/saved.js'
import { Icon } from '../ui/icons.jsx'
import { ProfileButton, ProviderListCard, SkeletonCard, TabBar } from '../ui/pieces.jsx'

export default function Saved({ refs, coords, onOpenProvider, onToggleSave, onRemove, onNavigate, account, onOpenProfile }) {
  const items = useSavedProviders(refs, coords)

  return (
    <div className="pm-screen">
      <main className="pm-scroll pm-scroll--discover">
        <header className="pm-pagehead">
          <div className="pm-stack-4">
            <h1 className="pm-hero pm-hero--page">Saved</h1>
            <p className="pm-meta pm-m0">People you want to come back to</p>
          </div>
          <ProfileButton account={account} onOpen={onOpenProfile} />
        </header>

        {items.length === 0 ? (
          <div className="pm-empty">
            <Icon name="bookmark" size={28} className="pm-muted" />
            <p className="pm-title-15">Nobody saved yet</p>
            <p className="pm-meta">Tap the bookmark on anyone you find and they’ll be here when you need them.</p>
            <button type="button" className="pm-btn pm-btn--primary pm-empty__btn" onClick={() => onNavigate('discover')}>
              Find someone
            </button>
          </div>
        ) : (
          <div className="pm-stack-10" aria-live="polite">
            {items.map(({ id, provider, failed }) => {
              if (failed) {
                return (
                  <div key={id} className="pm-listcard pm-failed">
                    <span className="pm-meta pm-grow">
                      {id.startsWith('pm:') ? 'This business isn’t on PuntMe right now.' : 'This business couldn’t be loaded from Google right now.'}
                    </span>
                    <button type="button" className="pm-btn pm-btn--soft" onClick={() => onRemove(id)}>
                      Remove
                    </button>
                  </div>
                )
              }
              if (!provider) return <SkeletonCard key={id} />
              return <ProviderListCard key={id} provider={provider} saved onOpen={onOpenProvider} onToggleSave={onToggleSave} />
            })}
          </div>
        )}
      </main>
<<<<<<< Updated upstream
      <TabBar active="saved" onNavigate={onNavigate} savedCount={refs.length} newQuotes={account.unread} />
=======
      <TabBar active="saved" onNavigate={onNavigate} savedCount={refs.length} unread={account.unread} />
>>>>>>> Stashed changes
    </div>
  )
}
