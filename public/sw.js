const CACHE_NAME = 'findash-v20261002';

// 1. Install 단계: 즉시 대기 상태 건너뛰기
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. Activate 단계: 기존 findash-cache-v1 및 구버전 캐시 무조건 전량 삭제 & 클라이언트 제어
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Purging outdated cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    }).then(() => {
      return self.clients.matchAll({ type: 'window' });
    }).then((clients) => {
      clients.forEach((client) => {
        if (client.url && 'navigate' in client) {
          client.navigate(client.url);
        }
      });
    })
  );
});

// 3. Fetch 단계: Network-First 전략 (항상 최신 코드를 네트워크에서 직접 로드)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Chrome extensions, 외부 API(Supabase 등)는 SW 개입 제외
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // HTML 내비게이션: 항상 네트워크 우선, 실패(오프라인) 시에만 캐시 폴백
  if (event.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match('/index.html');
        })
    );
    return;
  }

  // JS, CSS, 정적 이미지: 네트워크 우선, 실패 시 캐시 폴백 (404 시 절대 HTML 반환 안 함)
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
