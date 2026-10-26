import { Icon } from './icons.jsx'
import Sheet from './Sheet.jsx'

/** iPhone and iPad can't be asked to install, so this shows the two taps. */
export default function InstallSheet({ open, onClose }) {
  return (
    <Sheet open={open} onClose={onClose} labelledBy="install-title" className="pm-sheet--short">
      <div className="pm-row-between">
        <h2 id="install-title" className="pm-h2">Install PuntMe</h2>
        <button type="button" className="pm-textlink" onClick={onClose}>
          Done
        </button>
      </div>
      <p className="pm-meta pm-m0 pm-pad-x-4">
        PuntMe opens full screen from your Home Screen, works with no signal, and can send you notifications.
      </p>
      <ol className="pm-card pm-steps">
        <li>
          <span className="pm-steps__num">1</span>
          <span className="pm-grow">
            Tap <strong>Share</strong> in Safari’s toolbar
          </span>
          <Icon name="shareIos" size={22} className="pm-accent" />
        </li>
        <li>
          <span className="pm-steps__num">2</span>
          <span className="pm-grow">
            Choose <strong>Add to Home Screen</strong>
          </span>
          <Icon name="addSquare" size={22} className="pm-accent" />
        </li>
        <li>
          <span className="pm-steps__num">3</span>
          <span className="pm-grow">
            Open PuntMe from your Home Screen, then turn on notifications in your profile
          </span>
          <Icon name="bell" size={22} className="pm-accent" />
        </li>
      </ol>
      <p className="pm-footnote">Using Chrome on iPhone? Tap ⋯ or Share, then Add to Home Screen.</p>
    </Sheet>
  )
}
