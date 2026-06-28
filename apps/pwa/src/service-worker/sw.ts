/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { BackgroundSyncPlugin } from 'workbox-background-sync'
import { ATTENDANCE_SYNC_TAG } from './sync'

declare const self: ServiceWorkerGlobalScope & typeof globalThis

// Bản service-worker mới chiếm quyền NGAY (không chờ đóng hết tab) — để các bản sửa lỗi
// được áp dụng tức thì thay vì kẹt ở bản cũ trong cache.
self.skipWaiting()
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// SPA: mọi điều hướng (kể cả khi offline) trả về app shell đã precache → mở app được khi mất mạng.
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

const bgSyncPlugin = new BackgroundSyncPlugin(ATTENDANCE_SYNC_TAG, {
  maxRetentionTime: 24 * 60,
})

// Điểm danh (POST): online gửi thẳng; offline xếp hàng background-sync rồi gửi lại khi có mạng.
registerRoute(
  ({ url, request }) =>
    url.pathname.includes('/attendance') && request.method === 'POST',
  new NetworkFirst({
    cacheName: 'attendance-posts',
    plugins: [bgSyncPlugin],
  }),
  'POST',
)

// GET điểm danh/phân bổ: ƯU TIÊN MẠNG (NetworkFirst) để luôn thấy trạng thái mới nhất —
// sửa lỗi cache cũ đè lên sau khi gạt sang PENDING; chỉ rơi về cache khi offline.
registerRoute(
  ({ url }) =>
    url.pathname.includes('/rounds/') &&
    (url.pathname.includes('/attendance') || url.pathname.includes('/allocations')),
  new NetworkFirst({ cacheName: 'attendance-cache', networkTimeoutSeconds: 5 }),
)

registerRoute(
  ({ url }) => url.pathname === '/me/assignments',
  new NetworkFirst({
    cacheName: 'assignments-cache',
    networkTimeoutSeconds: 5,
  }),
)

// Cho admin xem offline: danh sách chuyến (/trips) và chi tiết 1 chuyến (/trips/:id).
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' && /^\/trips(\/[^/]+)?$/.test(url.pathname),
  new NetworkFirst({ cacheName: 'trips-cache', networkTimeoutSeconds: 5 }),
)

registerRoute(
  ({ url }) =>
    url.pathname.includes('/passengers') && !url.pathname.includes('export'),
  new NetworkFirst({ cacheName: 'passengers-cache', networkTimeoutSeconds: 5 }),
)
