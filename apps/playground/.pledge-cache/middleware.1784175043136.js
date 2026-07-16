
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'middleware.ts';
  const __pledge_hot_data = {};
  const __pledge_hot_dispose_callbacks = [];
  const __pledge_hot_accept_callbacks = [];
  import.meta.hot = {
    data: __pledge_hot_data,
    accept(cb) {
      if (typeof cb === 'function') __pledge_hot_accept_callbacks.push(cb);
    },
    dispose(cb) {
      if (typeof cb === 'function') __pledge_hot_dispose_callbacks.push(cb);
    },
    invalidate() {
      console.log('[pledge] HMR invalidate:', __pledge_hot_id);
      window.__pledge_hmr_invalidate = true;
      location.reload();
    },
    __run_dispose() {
      __pledge_hot_dispose_callbacks.forEach(cb => {
        try { cb(__pledge_hot_data); } catch(e) { console.error('[pledge] HMR dispose error:', e); }
      });
      __pledge_hot_dispose_callbacks.length = 0;
    },
    __run_accept(newModule) {
      __pledge_hot_accept_callbacks.forEach(cb => {
        try { cb(newModule); } catch(e) { console.error('[pledge] HMR accept error:', e); }
      });
    }
  };
}

export default function middleware(req) {
	const url = new URL(req.url);
	if (url.pathname === "/old-home") {
		return { redirect: {
			destination: "/",
			permanent: true
		} };
	}
	return {
		next: true,
		headers: {
			"X-Frame-Options": "DENY",
			"X-Content-Type-Options": "nosniff",
			"Referrer-Policy": "strict-origin-when-cross-origin"
		}
	};
}

if (import.meta.hot) {
import.meta.hot.accept();
}