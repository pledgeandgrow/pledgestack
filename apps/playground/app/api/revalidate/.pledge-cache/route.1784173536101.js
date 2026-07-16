
// Pledge HMR polyfill — import.meta.hot API
if (!import.meta.hot) {
  const __pledge_hot_id = 'app/api/revalidate/route.ts';
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

import { revalidateTag, revalidatePath } from "pledgestack/server";
export async function POST(req) {
	const url = new URL(req.url);
	const secret = url.searchParams.get("secret");
	if (secret !== process.env.PLEDGE_REVALIDATE_SECRET) {
		return Response.json({ error: "Invalid secret" }, { status: 401 });
	}
	const tags = url.searchParams.getAll("tag");
	const paths = url.searchParams.getAll("path");
	const revalidated = [];
	for (const tag of tags) {
		revalidateTag(tag);
		revalidated.push(`tag:${tag}`);
	}
	for (const path of paths) {
		revalidatePath(path);
		revalidated.push(`path:${path}`);
	}
	return Response.json({
		revalidated: revalidated.length > 0,
		items: revalidated
	});
}

if (import.meta.hot) {
import.meta.hot.accept();
}