import { useEffect, useRef, useState } from 'react'

/** Swipeable photos and videos, edge to edge, with a "2 / 7" counter. */
export default function Gallery({ items, name }) {
  const track = useRef(null)
  const [index, setIndex] = useState(0)
  // The parent builds a new array each render; only re-run when the files change.
  const urls = items.map((m) => m.url).join(' ')

  // Videos play while they're on screen and pause once you swipe (or scroll)
  // away. Phones only autoplay muted video, so they start muted; if you turn
  // the sound on and the phone won't play it with sound, it plays muted.
  // With Reduce Motion on they still pause, but you press play yourself.
  useEffect(() => {
    const autoplay = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const videos = track.current?.querySelectorAll('video') ?? []
    const watch = new IntersectionObserver(
      (entries) => {
        for (const { target: v, intersectionRatio } of entries) {
          if (intersectionRatio < 0.6) v.pause()
          else if (autoplay)
            v.play().catch(() => {
              v.muted = true
              v.play().catch(() => {})
            })
        }
      },
      { threshold: [0, 0.6] },
    )
    videos.forEach((v) => {
      v.muted = true
      watch.observe(v)
    })
    return () => watch.disconnect()
  }, [urls])

  function onScroll() {
    const el = track.current
    setIndex(Math.round(el.scrollLeft / el.clientWidth))
  }

  return (
    <div className="pm-gallery">
      <div
        ref={track}
        className="pm-gallery__track"
        onScroll={onScroll}
        role="group"
        aria-roledescription="carousel"
        aria-label={`Photos and videos of ${name}`}
      >
        {items.map((m, i) => (
          <div key={m.id} className="pm-gallery__slide" role="group" aria-label={`${i + 1} of ${items.length}`}>
            {m.kind === 'video' ? (
              // #t=0.1 makes iPhones show the first frame instead of a black box
              <video src={`${m.url}#t=0.1`} controls muted loop playsInline preload="metadata" />
            ) : (
              <img src={m.url} alt={`${name}, photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} />
            )}
          </div>
        ))}
      </div>
      {/* Hidden on videos so it doesn't sit on the player's controls */}
      {items.length > 1 && items[index]?.kind !== 'video' && (
        <span className="pm-gallery__count" aria-hidden="true">
          {index + 1} / {items.length}
        </span>
      )}
    </div>
  )
}
