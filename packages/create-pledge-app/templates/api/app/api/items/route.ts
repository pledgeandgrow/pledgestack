const items: Map<string, { id: string; name: string }> = new Map();

export async function GET() {
  return Response.json(Array.from(items.values()));
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = crypto.randomUUID();
  const item = { id, ...body };
  items.set(id, item);
  return Response.json(item, { status: 201 });
}
