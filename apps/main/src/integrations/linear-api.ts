/**
 * Minimal Linear GraphQL client for PAT verification.
 * @see https://developers.linear.app/docs/graphql/working-with-the-graphql-api
 */
const DEFAULT_LINEAR_API_URL = "https://api.linear.app/graphql";

export async function verifyLinearPat(
  pat: string,
  apiUrl = process.env.LINEAR_API_URL ?? DEFAULT_LINEAR_API_URL,
): Promise<{ ok: true; viewerId: string } | { ok: false; message: string }> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: pat,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: "{ viewer { id } }" }),
  });
  const json = (await res.json()) as {
    data?: { viewer?: { id?: string } };
    errors?: { message?: string }[];
  };
  if (!res.ok) {
    return { ok: false, message: `Linear HTTP ${res.status}` };
  }
  if (json.errors?.length) {
    return { ok: false, message: json.errors[0]?.message ?? "Linear API error" };
  }
  const id = json.data?.viewer?.id;
  if (!id) {
    return { ok: false, message: "Unexpected Linear response" };
  }
  return { ok: true, viewerId: id };
}
