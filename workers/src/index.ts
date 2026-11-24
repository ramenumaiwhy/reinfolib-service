import { Hono } from "hono";

const app = new Hono();

// --- 定数 ---
const REINFOLIB_API_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const ALLOWED_ENDPOINTS = ["XIT001", "XIT002"];
// --- API プロキシ ---
app.get("/api/:endpoint", async (c) => {
  const endpoint = c.req.param("endpoint");

  // エンドポイント制限: XIT001 / XIT002 のみ許可
  if (!ALLOWED_ENDPOINTS.includes(endpoint)) {
    return c.json({ error: "Forbidden: endpoint not allowed" }, 403);
  }

  // APIキーの取得（ヘッダーから転送）
  const apiKey = c.req.header("Ocp-Apim-Subscription-Key");
  if (!apiKey) {
    return c.json({ error: "Missing API key header" }, 401);
  }

  // クエリパラメータをそのまま転送
  const url = new URL(`${REINFOLIB_API_URL}/${endpoint}`);
  const queryParams = c.req.query();
  for (const [key, value] of Object.entries(queryParams)) {
    url.searchParams.set(key, value);
  }

  // reinfolib API へリクエスト（30秒タイムアウト）
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);
  let resp: Response;
  try {
    resp = await fetch(url.toString(), {
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
      },
      redirect: "manual",
      signal: controller.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      return c.json({ error: "Upstream API timeout" }, 504);
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }

  if (resp.status >= 300 && resp.status < 400) {
    return c.json({ error: "Unexpected upstream redirect" }, 502);
  }

  // レスポンスをそのまま返す
  const body = await resp.text();
  return new Response(body, {
    status: resp.status,
    headers: {
      "Content-Type": resp.headers.get("Content-Type") || "application/json",
    },
  });
});

export default app;
