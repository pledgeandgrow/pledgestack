import { revalidateTag, revalidatePath } from 'pledgestack/server';

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');

  // Check secret for authorization
  if (secret !== process.env.PLEDGE_REVALIDATE_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 });
  }

  const tags = url.searchParams.getAll('tag');
  const paths = url.searchParams.getAll('path');

  const revalidated: string[] = [];

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
    items: revalidated,
  });
}
