export function hasDeepgramKey(): boolean {
  return !!process.env.DEEPGRAM_API_KEY;
}

let cachedProjectId: string | null = null;

async function getProjectId(apiKey: string): Promise<string> {
  if (cachedProjectId) return cachedProjectId;
  if (process.env.DEEPGRAM_PROJECT_ID) {
    cachedProjectId = process.env.DEEPGRAM_PROJECT_ID;
    return cachedProjectId;
  }

  const res = await fetch("https://api.deepgram.com/v1/projects", {
    headers: { Authorization: `Token ${apiKey}` },
  });
  if (!res.ok) {
    throw new Error(`Deepgram projects lookup failed (${res.status})`);
  }
  const data = (await res.json()) as { projects?: { project_id?: string }[] };
  const projectId = data.projects?.[0]?.project_id;
  if (!projectId) {
    throw new Error("No Deepgram project found for this API key.");
  }
  cachedProjectId = projectId;
  return projectId;
}

/**
 * Mints a short-lived, scoped Deepgram key so the browser can open a direct
 * WebSocket to Deepgram's live endpoint without ever seeing the permanent
 * server-side key. Returns null on any failure so the route can respond with
 * a clean error instead of leaking provider details to the client.
 */
export async function mintTempDeepgramKey(): Promise<string | null> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return null;

  try {
    const projectId = await getProjectId(apiKey);
    const res = await fetch(`https://api.deepgram.com/v1/projects/${projectId}/keys`, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        comment: "interviewos live-copilot temp key",
        scopes: ["usage:write"],
        time_to_live_in_seconds: 60,
      }),
    });

    if (!res.ok) {
      console.warn(`[deepgram] key mint failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as { key?: string };
    return data.key ?? null;
  } catch (error) {
    console.warn("[deepgram] unexpected error minting temp key:", error);
    return null;
  }
}
