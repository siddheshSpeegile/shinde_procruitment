import { getSession } from "./session";

// Headers for requests that cannot go through apiFetch (photo / logo uploads: fetch has to
// build the multipart Content-Type itself). Same sign-in token and app label apiFetch sends,
// which the server now requires on every request.
export async function authHeaders() {
  const session = await getSession();
  return {
    "X-Client": "mobile",
    ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
  };
}
