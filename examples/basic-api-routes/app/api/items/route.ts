interface Item {
  id: string;
  name: string;
  price: number;
}

const items: Map<string, Item> = new Map();

export async function GET() {
  return Response.json(Array.from(items.values()));
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = crypto.randomUUID();
  const item: Item = { id, ...body };
  items.set(id, item);
  return Response.json(item, { status: 201 });
}
