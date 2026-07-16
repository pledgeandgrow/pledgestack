
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'app/about/page.tsx';
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

export default function AboutPage() {
	return React.createElement("main", { style: {
		fontFamily: "system-ui, sans-serif",
		padding: "2rem",
		maxWidth: "800px",
		margin: "0 auto"
	} }, React.createElement("h1", null, "About PledgeStack"), React.createElement("p", null, "PledgeStack is a Next.js-inspired framework built with TypeScript and React 19."), React.createElement("p", null, React.createElement("a", {
		href: "/",
		style: {
			color: "#0070f3",
			textDecoration: "none"
		}
	}, "← Back home")));
}

if (import.meta.hot) {
import.meta.hot.accept();
}