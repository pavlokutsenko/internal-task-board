export async function readJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
