// Development-only payload loading. The production inline path still calls
// applyPayload() directly between the @PAYLOADS markers in index.html.
//
// Kept deliberately free of game state: URL resolution, sequential imports,
// default-export validation and registration order are the whole contract.
export async function loadPayloadModules({ search, baseUrl, applyPayload }) {
  const payloadQuery = new URLSearchParams(search).get("payloads");
  if (!payloadQuery) return;

  for (const spec of payloadQuery.split(",").map((entry) => entry.trim()).filter(Boolean)) {
    const module = await import(new URL(spec, baseUrl).href);
    if (typeof module.default !== "function") {
      throw new Error(`[payload] ${spec}: module has no default-exported register(ctx) function`);
    }
    applyPayload(module.default, spec);
  }
}
