/**
 * Minimal Linear GraphQL client for PAT verification.
 * @see https://developers.linear.app/docs/graphql/working-with-the-graphql-api
 */
export async function verifyLinearPat(pat: string): Promise<{ ok: true; viewerId: string } | { ok: false; message: string }> {
  const res = await fetch("https://api.linear.app/graphql", {
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
