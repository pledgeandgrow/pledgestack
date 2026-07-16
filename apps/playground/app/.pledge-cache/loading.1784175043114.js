
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'app/loading.tsx';
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

var _jsxFileName = "\\\\?\\C:\\Users\\pledg\\png\\pledgelabs\\pledgejs\\apps\\playground\\app\\loading.tsx";
import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
export default function Loading() {
	return _jsxDEV("main", {
		style: {
			fontFamily: "system-ui, sans-serif",
			padding: "2rem",
			maxWidth: "800px",
			margin: "0 auto"
		},
		children: [_jsxDEV("div", {
			style: {
				display: "flex",
				alignItems: "center",
				gap: "0.75rem"
			},
			children: [_jsxDEV("div", { style: {
				width: "20px",
				height: "20px",
				border: "3px solid #e0e0e0",
				borderTopColor: "#0070f3",
				borderRadius: "50%",
				animation: "pledge-spin 0.8s linear infinite"
			} }, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 5,
				columnNumber: 9
			}, this), _jsxDEV("span", {
				style: { color: "#666" },
				children: "Loading..."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 13,
				columnNumber: 9
			}, this)]
		}, void 0, true, {
			fileName: _jsxFileName,
			lineNumber: 4,
			columnNumber: 7
		}, this), _jsxDEV("style", { children: `@keyframes pledge-spin { to { transform: rotate(360deg); } }` }, void 0, false, {
			fileName: _jsxFileName,
			lineNumber: 15,
			columnNumber: 7
		}, this)]
	}, void 0, true, {
		fileName: _jsxFileName,
		lineNumber: 3,
		columnNumber: 5
	}, this);
}


// React Fast Refresh — injected by Pledge
if (import.meta.hot) {
  import.meta.hot.accept(() => {
    if (typeof window !== 'undefined' && window.__pledge_fast_refresh) {
      window.__pledge_fast_refresh('loading', () => import(import.meta.url));
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