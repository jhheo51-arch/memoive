const CACHE='memoive-v76-organized-20261007';
const ASSETS=[
  './frontend/js/writing-paths.js?v=62-fast-draft','./frontend/css/writing-paths.css?v=57-view-record','./frontend/js/creator-scroll.js?v=50',
  './frontend/js/thought-writing.js?v=70-creator-quality','./frontend/css/thought-writing.css?v=48','./frontend/js/six-part-analysis.js?v=60-youtube-transcript',
  './frontend/css/six-part-analysis.css?v=45-clean-detail','./frontend/js/auto-summary.js?v=71-long-pdf','./frontend/js/record-original.js?v=76-organized',
  './frontend/js/record-delete.js?v=76-organized','./frontend/js/detail-navigation.js?v=57','./frontend/js/record-ownership.js?v=38-no-badges',
  './frontend/js/reuse-tools.js?v=41-brunch','./frontend/js/reuse-ui.js?v=57-return','./frontend/css/reuse.css?v=57-no-previews',
  './frontend/js/evidence-tools.js?v=31-evidence','./frontend/js/evidence-ui.js?v=31-evidence','./frontend/js/study-tools.js?v=31-evidence',
  './tools/self-test/self-test.js?v=31-evidence','./tools/self-test/self-test.css?v=31-evidence','./frontend/js/analytics-tools.js?v=31-evidence',
  './frontend/js/analytics-ui.js?v=38-no-badges','./frontend/css/analytics.css?v=31-evidence','./frontend/js/insight-contract.js?v=46-flexible-evidence',
  './frontend/js/insight-context.js?v=71-long-pdf','./frontend/js/insight-tools.js?v=31-evidence','./frontend/js/storage-guard.js?v=31-evidence',
  './frontend/js/accessibility.js?v=39-originals','./frontend/css/mobile-safety.css?v=31-evidence','./','./index.html','./frontend/css/styles.css',
  './frontend/css/refinement.css?v=67-delete-colors','./frontend/js/config.js','./frontend/js/link-reader.js?v=72-pdf-title',
  './frontend/js/data-tools.js?v=64-video-links','./frontend/js/app.js?v=76-organized','./frontend/js/cloud-sync.js?v=76-organized','./frontend/js/case-studies.js?v=38-no-badges',
  './manifest.webmanifest','./assets/icon.svg','./tools/self-test/index.html','./tools/self-test/self-test.css?v=31-evidence','./tools/self-test/self-test.js?v=31-evidence'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('memoive-')&&k!==CACHE).map(k=>caches.delete(k)))),
  clients.claim()
])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list[0]?.focus()||clients.openWindow('./')))});
