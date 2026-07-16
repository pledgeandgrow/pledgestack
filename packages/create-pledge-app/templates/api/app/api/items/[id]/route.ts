const items: Map<string, { id: string; name: string }> = new Map();

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const item = items.get(params.id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(item);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  items.delete(params.id);
  return new Response(null, { status: 204 });
}
