// Messages between customers and businesses on PuntMe (server/chat.js).

import { api } from './api.js'

export const listChats = () => api('/conversations').then((d) => d.conversations)
export const getChat = (id) => api(`/conversations/${encodeURIComponent(id)}`)
export const chatWith = (businessId) => api(`/conversations/with/${encodeURIComponent(businessId)}`).then((d) => d.conversation)

/** Starts the chat with a business (or adds to it) with a first message. */
export const startChat = (businessId, body, photo) => api('/conversations', { method: 'POST', body: { businessId, body, photo } })

export const sendMessage = (id, body, photo) =>
  api(`/conversations/${encodeURIComponent(id)}/messages`, { method: 'POST', body: { body, photo } }).then((d) => d.message)

export const markChatRead = (id) => api(`/conversations/${encodeURIComponent(id)}/read`, { method: 'POST' })
export const muteChat = (id, muted) => api(`/conversations/${encodeURIComponent(id)}/mute`, { method: 'POST', body: { muted } })
export const deleteChat = (id) => api(`/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' })
export const editMessage = (id, body) => api(`/messages/${id}`, { method: 'PATCH', body: { body } }).then((d) => d.message)
export const unsendMessage = (id) => api(`/messages/${id}`, { method: 'DELETE' }).then((d) => d.message)

/** The app shows Edit for this long after sending (the server allows a little more). */
export const EDIT_WINDOW_MS = 60_000

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
const daysAgo = (ms) => Math.round((startOfDay(new Date()) - startOfDay(new Date(ms))) / 86_400_000)
const clock = (ms) => new Date(ms).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })

/** Chat list time: "14:05" today, "Yesterday", the weekday this week, else "12/10/26". */
export function listTime(ms) {
  const days = daysAgo(ms)
  if (days === 0) return clock(ms)
  if (days === 1) return 'Yesterday'
  if (days < 7) return new Date(ms).toLocaleDateString('en-ZA', { weekday: 'long' })
  return new Date(ms).toLocaleDateString('en-ZA', { day: 'numeric', month: 'numeric', year: '2-digit' })
}

/** Divider in a thread: { day: 'Today', time: '09:23' }. */
export function threadStamp(ms) {
  const days = daysAgo(ms)
  const day =
    days === 0
      ? 'Today'
      : days === 1
        ? 'Yesterday'
        : days < 7
          ? new Date(ms).toLocaleDateString('en-ZA', { weekday: 'long' })
          : new Date(ms).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
  return { day, time: clock(ms) }
}

export const clockTime = clock

/**
 * A picked photo → a JPEG data URL no larger than 1600px, so it sends
 * quickly on mobile data. HEIC from iPhones is decoded by the browser.
 */
export async function photoFromFile(file, max = 1600) {
  if (!file.type.startsWith('image/')) throw new Error('Choose a photo.')
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error('That photo couldn’t be opened. Try another one.')
  })
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  return canvas.toDataURL('image/jpeg', 0.82)
}

/** Closes this chat's notifications once it's open on screen. */
export async function clearChatNotifications(id) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    const list = (await reg?.getNotifications({ tag: `chat-${id}` })) ?? []
    list.forEach((n) => n.close())
  } catch {
    // no notifications to clear
  }
}

/** Fired by App when a push arrives while PuntMe is open. */
export const PUSH_EVENT = 'puntme:push'
