import { useEffect, useRef, useState } from 'react'
import { api, apiUrl, upload } from '../lib/api.js'
import { photoFromFile } from '../lib/image.js'
import { Icon } from './icons.jsx'
import { showToast } from './Toast.jsx'

// Same limits as the server (server/api.js).
const MAX_MEDIA = 20
const MAX_VIDEOS = 5
const MAX_VIDEO_MB = 60
const VIDEO_TYPES = /^video\/(mp4|quicktime|webm)$/

let nextKey = 0

/**
 * The owner's photo and video changes, kept as a draft until they tap Save:
 * new files wait on the phone, deletions are only marked.
 */
export function useMediaDraft(business, onSaved) {
  const [drafts, setDrafts] = useState([]) // { key, kind, blob, preview, name }
  const [removed, setRemoved] = useState(() => new Set())
  const [saving, setSaving] = useState(null) // { key, progress, done, total }
  const media = business?.media ?? []
  const kept = media.filter((m) => !removed.has(m.id))
  const changes = drafts.length + removed.size
  const room = MAX_MEDIA - kept.length - drafts.length

  // Leaving or reloading the page would lose the draft.
  useEffect(() => {
    if (!changes) return
    const warn = (e) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [changes])

  // Free the previews when the screen closes.
  const draftsRef = useRef(drafts)
  draftsRef.current = drafts
  useEffect(() => () => draftsRef.current.forEach((d) => URL.revokeObjectURL(d.preview)), [])

  async function add(files) {
    const picked = [...files]
    if (picked.length > room) showToast(room > 0 ? `You can add ${room} more.` : `You can have up to ${MAX_MEDIA} photos and videos.`)
    let videos = kept.filter((m) => m.kind === 'video').length + drafts.filter((d) => d.kind === 'video').length
    for (const file of picked.slice(0, Math.max(room, 0))) {
      try {
        let blob = file
        const kind = file.type.startsWith('video/') ? 'video' : 'photo'
        if (kind === 'photo') blob = await photoFromFile(file)
        else if (!VIDEO_TYPES.test(file.type)) throw new Error(`“${file.name}” isn’t a video PuntMe can play. Use MP4 or MOV.`)
        else if (file.size > MAX_VIDEO_MB * 1024 * 1024) throw new Error(`“${file.name}” is over ${MAX_VIDEO_MB} MB. Trim it shorter on your phone first.`)
        else if (++videos > MAX_VIDEOS) throw new Error(`You can add up to ${MAX_VIDEOS} videos.`)
        setDrafts((list) => [...list, { key: ++nextKey, kind, blob, preview: URL.createObjectURL(blob), name: file.name }])
      } catch (err) {
        showToast(err.message)
      }
    }
  }

  function dropDraft(key) {
    setDrafts((list) => {
      const d = list.find((x) => x.key === key)
      if (d) URL.revokeObjectURL(d.preview)
      return list.filter((x) => x.key !== key)
    })
  }

  const remove = (id) => setRemoved((s) => new Set(s).add(id))

  function discard() {
    drafts.forEach((d) => URL.revokeObjectURL(d.preview))
    setDrafts([])
    setRemoved(new Set())
  }

  async function save() {
    const total = changes
    let done = 0
    let failed = 0
    // One at a time, so a slow connection finishes something rather than nothing.
    for (const d of drafts) {
      setSaving({ key: d.key, progress: 0, done, total })
      try {
        await upload(`/businesses/${business.id}/media`, d.blob, {
          onProgress: (progress) => setSaving((s) => s && { ...s, progress }),
        })
        dropDraft(d.key)
      } catch (err) {
        failed++
        showToast(`${d.name}: ${err.message}`)
      }
      done++
    }
    for (const id of removed) {
      setSaving({ key: null, progress: 0, done, total })
      try {
        await api(`/businesses/${business.id}/media/${id}`, { method: 'DELETE' })
        setRemoved((s) => {
          const next = new Set(s)
          next.delete(id)
          return next
        })
      } catch (err) {
        failed++
        showToast(err.message)
      }
      done++
    }
    await onSaved()
    setSaving(null)
    if (!failed) showToast('Saved. Customers can see your photos and videos now.')
  }

  return { media: kept, drafts, room, changes, saving, add, dropDraft, remove, discard, save }
}

/* The grid on My business: what's saved, what's new, and the Add tile */
export default function MediaManager({ draft }) {
  const input = useRef(null)
  const { media, drafts, room, saving } = draft
  const coverKey = media.find((m) => m.kind === 'photo')?.id ?? drafts.find((d) => d.kind === 'photo')?.key
  const busy = Boolean(saving)

  return (
    <section className="pm-stack-12" aria-labelledby="media-heading">
      <div className="pm-row-between pm-baseline">
        <h2 id="media-heading" className="pm-h2">Photos & videos</h2>
        <span className="pm-meta">
          {media.length + drafts.length} of {MAX_MEDIA}
        </span>
      </div>
      {media.length + drafts.length === 0 && (
        <p className="pm-meta pm-m0">Show customers your work. Your first photo is the cover picture on your card.</p>
      )}
      <div className="pm-mediagrid">
        {media.map((m) => {
          const url = apiUrl(m.path)
          return (
            <div key={m.id} className="pm-mediatile">
              {m.kind === 'video' ? <video src={`${url}#t=0.1`} muted playsInline preload="metadata" /> : <img src={url} alt="" loading="lazy" />}
              <Tags kind={m.kind} cover={m.id === coverKey} />
              <button
                type="button"
                className="pm-mediatile__remove"
                aria-label={m.kind === 'video' ? 'Delete video' : 'Delete photo'}
                onClick={() => draft.remove(m.id)}
                disabled={busy}
              >
                <Icon name="close" size={14} strokeWidth={2.4} />
              </button>
            </div>
          )
        })}
        {drafts.map((d) => {
          const uploading = saving?.key === d.key
          return (
            <div key={d.key} className={`pm-mediatile is-draft ${uploading ? 'is-uploading' : ''}`}>
              {d.kind === 'video' ? <video src={d.preview} muted playsInline preload="metadata" /> : <img src={d.preview} alt="" />}
              <span className="pm-mediatile__new">New</span>
              <Tags kind={d.kind} cover={d.key === coverKey} />
              {uploading ? (
                <span className="pm-mediatile__bar" role="progressbar" aria-valuenow={Math.round(saving.progress * 100)} aria-label="Uploading">
                  <span style={{ transform: `scaleX(${saving.progress})` }} />
                </span>
              ) : (
                <button
                  type="button"
                  className="pm-mediatile__remove"
                  aria-label={d.kind === 'video' ? 'Remove new video' : 'Remove new photo'}
                  onClick={() => draft.dropDraft(d.key)}
                  disabled={busy}
                >
                  <Icon name="close" size={14} strokeWidth={2.4} />
                </button>
              )}
            </div>
          )
        })}
        {room > 0 && (
          <button type="button" className="pm-mediatile pm-mediatile--add" onClick={() => input.current.click()} disabled={busy}>
            <Icon name="camera" size={24} />
            Add
          </button>
        )}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        multiple
        hidden
        onChange={(e) => {
          draft.add(e.target.files)
          e.target.value = '' // so picking the same file again still works
        }}
      />
    </section>
  )
}

function Tags({ kind, cover }) {
  if (kind === 'video') {
    return (
      <span className="pm-mediatile__tag">
        <Icon name="play" size={11} filled />
        Video
      </span>
    )
  }
  return cover ? <span className="pm-mediatile__tag">Cover</span> : null
}

/* Pinned to the bottom of My business while there are unsaved changes */
export function MediaSaveBar({ draft }) {
  const { changes, saving } = draft
  if (!changes && !saving) return null
  return (
    <div className="pm-bottombar pm-savebar" role="region" aria-label="Unsaved photo changes">
      <span className="pm-stack-2 pm-grow">
        <span className="pm-title-15">{saving ? `Saving ${Math.min(saving.done + 1, saving.total)} of ${saving.total}…` : 'Unsaved changes'}</span>
        <span className="pm-meta">
          {saving ? 'Keep PuntMe open until it’s done' : `${changes} photo${changes === 1 ? '' : 's'} or video${changes === 1 ? '' : 's'} not saved yet`}
        </span>
      </span>
      {!saving && (
        <button type="button" className="pm-textlink" onClick={draft.discard}>
          Discard
        </button>
      )}
      <button type="button" className="pm-btn pm-btn--primary pm-btn--grow-0" onClick={draft.save} disabled={Boolean(saving)}>
        {saving ? 'Saving…' : 'Save'}
      </button>
    </div>
  )
}
