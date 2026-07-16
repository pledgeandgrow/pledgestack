export async function GET(): Promise<Response> {
  return Response.json({
    message: 'Hello from PledgeStack API!',
    timestamp: new Date().toISOString(),
  });
}
