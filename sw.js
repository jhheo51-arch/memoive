const CACHE='memoive-v73-cloud-sync-20261007';
const ASSETS=[
  './writing-paths.js?v=57-view-record','./writing-paths.css?v=57-view-record','./creator-scroll.js?v=50',
  './thought-writing.js?v=70-creator-quality','./thought-writing.css?v=48','./six-part-analysis.js?v=45-clean-detail',
  './six-part-analysis.css?v=45-clean-detail','./auto-summary.js?v=71-long-pdf','./record-original.js?v=57-original-link',
  './record-delete.js?v=59-all-records','./detail-navigation.js?v=57','./record-ownership.js?v=38-no-badges',
  './reuse-tools.js?v=41-brunch','./reuse-ui.js?v=57-return','./reuse.css?v=57-no-previews',
  './evidence-tools.js?v=31-evidence','./evidence-ui.js?v=31-evidence','./study-tools.js?v=31-evidence',
  './self-test.js?v=31-evidence','./self-test.css?v=31-evidence','./analytics-tools.js?v=31-evidence',
  './analytics-ui.js?v=38-no-badges','./analytics.css?v=31-evidence','./insight-contract.js?v=46-flexible-evidence',
  './insight-context.js?v=71-long-pdf','./insight-tools.js?v=31-evidence','./storage-guard.js?v=31-evidence',
  './accessibility.js?v=39-originals','./mobile-safety.css?v=31-evidence','./','./index.html','./styles.css',
  './refinement.css?v=67-delete-colors','./config.js','./link-reader.js?v=72-pdf-title',
  './data-tools.js?v=64-video-links','./app.js?v=73-cloud-sync','./cloud-sync.js?v=73-cloud-sync','./case-studies.js?v=38-no-badges',
  './manifest.webmanifest','./icon.svg','./self-test.html','./self-test.css?v=31-evidence','./self-test.js','./study-tools.js'
];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('memoive-')&&k!==CACHE).map(k=>caches.delete(k)))),
  clients.claim()
])));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))});
self.addEventListener('notificationclick',e=>{e.notification.close();e.waitUntil(clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>list[0]?.focus()||clients.openWindow('./')))});
