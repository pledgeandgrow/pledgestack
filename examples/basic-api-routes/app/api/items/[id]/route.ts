interface Item {
  id: string;
  name: string;
  price: number;
}

const items: Map<string, Item> = new Map();

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const item = items.get(params.id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(item);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const item = items.get(params.id);
  if (!item) return Response.json({ error: 'Not found' }, { status: 404 });
  const updated = { ...item, ...body };
  items.set(params.id, updated);
  return Response.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  if (!items.has(params.id)) return Response.json({ error: 'Not found' }, { status: 404 });
  items.delete(params.id);
  return new Response(null, { status: 204 });
}
