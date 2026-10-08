export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export function json(data, status = 200, cacheSeconds = 0) {
  const headers = {
    ...CORS,
    "Content-Type": "application/json; charset=utf-8"
  };

  if (cacheSeconds > 0) {
    headers["Cache-Control"] = `public, max-age=${cacheSeconds}`;
  } else {
    headers["Cache-Control"] = "no-store";
  }

  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers
  });
}
