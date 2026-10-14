window.MEMOIVE_AI_ENDPOINT = 'https://memoive-gemini.jhheo5163.workers.dev/v1/refine';
// Public Worker URL ending in /v1/insight, never a Gemini API key.
window.MEMOIVE_INSIGHT_ENDPOINT = 'https://memoive-gemini.jhheo5163.workers.dev/v1/insight';
// Coaching routes: the AI asks questions and comments on drafts (needs the 2026-10-14 Worker deploy).
window.MEMOIVE_QUESTION_ENDPOINT = 'https://memoive-gemini.jhheo5163.workers.dev/v1/question';
window.MEMOIVE_FEEDBACK_ENDPOINT = 'https://memoive-gemini.jhheo5163.workers.dev/v1/feedback';
window.MEMOIVE_REFLECTION_ENDPOINT = 'https://memoive-gemini.jhheo5163.workers.dev/v1/reflection';
// 모든 배포 화면은 같은 Vercel API와 TOBEA Supabase 저장소를 사용합니다.
window.MEMOIVE_SYNC_ENDPOINT = 'https://memoive.vercel.app/api/sync';
window.MEMOIVE_ORIGINAL_ENDPOINT = 'https://memoive.vercel.app/api/original';
