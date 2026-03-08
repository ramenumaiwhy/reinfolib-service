import { Hono } from "hono";
import { cors } from "hono/cors";

const app = new Hono();

// --- 定数 ---
const REINFOLIB_API_URL = "https://www.reinfolib.mlit.go.jp/ex-api/external";
const ALLOWED_ENDPOINTS = ["XIT001", "XIT002"];
const ALLOWED_ORIGINS = [
  "https://ramenumaiwhy.github.io",
  "http://localhost:8000",
  "http://localhost:3000",
  "http://127.0.0.1:8000",
  "http://127.0.0.1:3000",
];

// --- CORS ミドルウェア ---
app.use(
  "/api/*",
  cors({
    origin: (origin) => {
      if (ALLOWED_ORIGINS.includes(origin)) return origin;
      return "";
    },
    allowHeaders: ["Ocp-Apim-Subscription-Key", "Content-Type"],
    allowMethods: ["GET", "OPTIONS"],
    maxAge: 86400,
  })
);

// --- ヘルスチェック ---
app.get("/", (c) => c.json({ status: "ok", service: "reinfolib-proxy" }));

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
