// ============================================================
// ===== Service Worker - متجر طالب الله =====
// ============================================================
const CACHE_NAME = 'taleb-store-v2';
const CACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;700;800&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css'
];

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: جاري التثبيت...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('📦 جاري تخزين الملفات الأساسية');
                return cache.addAll(CACHE_URLS);
            })
            .then(() => self.skipWaiting())
            .catch(err => console.warn('⚠️ خطأ في التخزين:', err))
    );
});

self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker: جاهز');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('🗑️ حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = event.request.url;
    
    if (url.includes('script.google.com')) {
        event.respondWith(
            fetch(event.request).catch(err => {
                console.warn('⚠️ فشل الاتصال بـ Apps Script');
                return new Response(
                    JSON.stringify({ success: false, error: 'لا يوجد اتصال بالإنترنت' }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            })
        );
        return;
    }
    
    if (event.request.method !== 'GET') {
        return;
    }
    
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                fetch(event.request).then(freshResponse => {
                    if (freshResponse && freshResponse.status === 200) {
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(event.request, freshResponse);
                        });
                    }
                }).catch(() => {});
                return cachedResponse;
            }
            
            return fetch(event.request).then(response => {
                if (!response || response.status !== 200 || response.type === 'opaque') {
                    return response;
                }
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                });
                return response;
            }).catch(() => {
                return caches.match('./index.html');
            });
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
