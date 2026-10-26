// Web Push (VAPID). Keys come from the environment, or are made once and
// kept in the data folder so subscriptions survive restarts.

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import webpush from 'web-push'

export function setupPush(dataDir) {
  let keys
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    keys = { publicKey: process.env.VAPID_PUBLIC_KEY, privateKey: process.env.VAPID_PRIVATE_KEY }
  } else {
    const file = join(dataDir, 'vapid.json')
    if (existsSync(file)) {
      keys = JSON.parse(readFileSync(file, 'utf8'))
    } else {
      keys = webpush.generateVAPIDKeys()
      writeFileSync(file, JSON.stringify(keys, null, 2), { mode: 0o600 })
    }
  }
  // Push services contact this address if the app misbehaves.
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@puntme.app', keys.publicKey, keys.privateKey)
  return keys.publicKey
}

/**
 * Send one notification. Resolves to 'gone' when the browser has dropped
 * the subscription (the caller should delete it), otherwise 'sent'/'failed'.
 * payload: { title, body, url, tag }
 */
export async function sendPush(sub, payload) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: payload.urgency ?? 'normal' },
    )
    return 'sent'
  } catch (err) {
    if (err.statusCode === 404 || err.statusCode === 410) return 'gone'
    console.warn('[push] send failed', err.statusCode ?? '', err.body ?? err.message)
    return 'failed'
  }
}
