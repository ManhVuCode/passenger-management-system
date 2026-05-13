/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ATTENDANCE_SYNC_TAG } from './sync'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

const bgSyncPlugin = new BackgroundSyncPlugin(ATTENDANCE_SYNC_TAG, {
  maxRetentionTime: 24 * 60,
})

registerRoute(
  ({ url, request }) =>
    url.pathname.includes('/attendance') && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'attendance-posts',
    plugins: [bgSyncPlugin],
  }),
  'POST',
)

registerRoute(
  ({ url }) =>
    url.pathname.includes('/rounds/') &&
    (url.pathname.includes('/attendance') || url.pathname.includes('/allocations')),
  new StaleWhileRevalidate({ cacheName: 'attendance-cache' }),
)

registerRoute(
  ({ url }) => url.pathname === '/me/assignments',
  new NetworkFirst({
    cacheName: 'assignments-cache',
    networkTimeoutSeconds: 5,
  }),
)

registerRoute(
  ({ url }) =>
    url.pathname.includes('/passengers') && !url.pathname.includes('export'),
  new StaleWhileRevalidate({ cacheName: 'passengers-cache' }),
)
