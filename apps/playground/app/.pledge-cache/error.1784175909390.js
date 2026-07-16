
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'app/error.tsx';
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

var _jsxFileName = "\\\\?\\C:\\Users\\pledg\\png\\pledgelabs\\pledgejs\\apps\\playground\\app\\error.tsx";
import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
export default function ErrorBoundary({ error, reset }) {
	return _jsxDEV("main", {
		style: {
			fontFamily: "system-ui, sans-serif",
			padding: "2rem",
			maxWidth: "800px",
			margin: "0 auto"
		},
		children: _jsxDEV("div", {
			style: {
				padding: "1.5rem",
				borderRadius: "8px",
				backgroundColor: "#fef2f2",
				border: "1px solid #fecaca"
			},
			children: [
				_jsxDEV("h2", {
					style: {
						color: "#dc2626",
						fontSize: "1.25rem",
						marginBottom: "0.5rem"
					},
					children: "Something went wrong"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 15,
					columnNumber: 9
				}, this),
				_jsxDEV("p", {
					style: {
						color: "#991b1b",
						fontSize: "0.9rem",
						marginBottom: "1rem"
					},
					children: error.message
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 18,
					columnNumber: 9
				}, this),
				_jsxDEV("button", {
					onClick: reset,
					style: {
						padding: "0.5rem 1rem",
						backgroundColor: "#0070f3",
						color: "white",
						border: "none",
						borderRadius: "6px",
						cursor: "pointer",
						fontSize: "0.9rem"
					},
					children: "Try again"
				}, void 0, false, {
					fileName: _jsxFileName,
					lineNumber: 21,
					columnNumber: 9
				}, this)
			]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 9,
			columnNumber: 7
		}, this)
	}, void 0, false, {
		fileName: _jsxFileName,
		lineNumber: 8,
		columnNumber: 5
	}, this);
}


// React Fast Refresh — injected by Pledge
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    if (typeof window !== 'undefined' && window.__pledge_fast_refresh) {
      window.__pledge_fast_refresh('error', () => import(import.meta.url));
    }
  });
  // Register for Fast Refresh
  if (typeof window !== 'undefined') {
    window.__pledge_fast_refresh = window.__pledge_fast_refresh || ((name, reload) => {
      console.log('[pledge] Fast Refresh:', name);
      reload();
    });
  }
}

if (import.meta.hot) {
import.meta.hot.accept();
}