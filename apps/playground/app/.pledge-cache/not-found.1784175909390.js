
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'app/not-found.tsx';
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

var _jsxFileName = "\\\\?\\C:\\Users\\pledg\\png\\pledgelabs\\pledgejs\\apps\\playground\\app\\not-found.tsx";
import { jsxDEV as _jsxDEV } from "react/jsx-dev-runtime";
export default function NotFound() {
	return _jsxDEV("main", {
		style: {
			fontFamily: "system-ui, sans-serif",
			padding: "2rem",
			maxWidth: "800px",
			margin: "0 auto",
			textAlign: "center"
		},
		children: [
			_jsxDEV("h1", {
				style: {
					fontSize: "3rem",
					color: "#0070f3",
					marginBottom: "0.5rem"
				},
				children: "404"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 4,
				columnNumber: 7
			}, this),
			_jsxDEV("p", {
				style: {
					color: "#666",
					fontSize: "1.1rem",
					marginBottom: "1.5rem"
				},
				children: "This page could not be found."
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 5,
				columnNumber: 7
			}, this),
			_jsxDEV("a", {
				href: "/",
				style: {
					color: "#0070f3",
					textDecoration: "none"
				},
				children: "Return home →"
			}, void 0, false, {
				fileName: _jsxFileName,
				lineNumber: 8,
				columnNumber: 7
			}, this)
		]
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
      window.__pledge_fast_refresh('not-found', () => import(import.meta.url));
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