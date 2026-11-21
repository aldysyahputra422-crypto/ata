import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const { API_URL, ANON_KEY, SERVICE_ROLE_KEY } = JSON.parse(execFileSync(
  "pnpm", ["exec", "supabase", "status", "-o", "json"],
  { stdio: ["ignore", "pipe", "ignore"], encoding: "utf8" },
));
assert.equal(API_URL, "http://127.0.0.1:54321", "This test runs only on the local Docker stack.");
const origin = "http://127.0.0.1:3000";
const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const code = "SMOKE" + randomBytes(8).toString("hex").toUpperCase();
const codeHash = createHash("sha256").update(code).digest("hex");
const userIds = [];

function assertSuccess(result) {
  assert.ok(!result.error, result.error?.code ?? result.error?.name);
  return result.data;
}

async function createAccount() {
  const email = randomUUID() + "@example.com";
  const password = randomBytes(20).toString("hex");
  const { user } = assertSuccess(await admin.auth.admin.createUser({ email, password, email_confirm: true }));
  userIds.push(user.id);
  const cookies = new Map();
  const client = createServerClient(API_URL, ANON_KEY, {
    cookies: {
      getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
      setAll: (entries) => entries.forEach(({ name, value }) => cookies.set(name, value)),
    },
  });
  const { session } = assertSuccess(await client.auth.signInWithPassword({ email, password }));
  const claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url"));
  const cookie = [...cookies].map(([name, value]) => name + "=" + value).join("; ");
  return { user, client, sessionId: claims.session_id, cookie };
}

async function api(path, { user, body, method = "GET", headers = {} } = {}) {
  const response = await fetch(origin + path, {
    method,
    redirect: "manual",
    headers: {
      ...(method !== "GET" ? { origin } : {}),
      ...(user ? { cookie: user.cookie } : {}),
      ...(body ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return {
    status: response.status,
    data: response.status === 204 || response.status === 302 ? null : await response.json(),
  };
}

try {
  assert.deepEqual(await api("/api/health"), { status: 200, data: { ok: true } });
  assert.equal((await api("/api/v1/me")).data.signed_in, false);
  assert.equal((await api("/api/v1/auth/google/start")).status, 503);
  assert.equal((await api("/api/v1/auth/google/callback?error=access_denied")).status, 302);
  assert.equal((await api("/api/v1/account/export", { user: { cookie: "sb-invalid=forged" } })).status, 401);

  const first = await createAccount();
  const second = await createAccount();
  assert.equal((await api("/api/v1/me", { user: first })).data.plan.plan, "free");
  assert.equal((await api("/api/v1/me", { user: second })).data.user.id, second.user.id);
  assert.equal((await api("/api/v1/redeem", {
    user: first, method: "POST", body: { code }, headers: { origin: "https://other.example" },
  })).status, 403);

  assertSuccess(await admin.from("redeem_codes").insert({
    code_hash: codeHash, label: "Temporary R0.1 smoke", max_uses: 1, days_granted: 30,
  }));
  const idempotencyKey = randomUUID();
  const claim = (user) => api("/api/v1/redeem", {
    user, method: "POST", body: { code }, headers: { "idempotency-key": idempotencyKey },
  });
  const outcomes = await Promise.all([claim(first), claim(second)]);
  assert.deepEqual(outcomes.map((result) => result.status).sort(), [200, 422]);
  const index = outcomes.findIndex((result) => result.status === 200);
  const winner = [first, second][index];
  const other = [second, first][index];

  assert.deepEqual(await claim(winner), outcomes[index]);
  assert.equal((await api("/api/v1/redeem", { user: winner, method: "POST", body: { code } })).status, 409);
  assert.equal((await api("/api/v1/me", { user: winner })).data.plan.plan, "pro");
  assert.equal((await api("/api/v1/me", { user: other })).data.plan.plan, "free");
  assert.deepEqual(assertSuccess(await other.client.from("entitlements").select("id").eq("user_id", winner.user.id)), []);
  const exported = await api("/api/v1/account/export?user_id=" + winner.user.id, { user: other });
  assert.equal(exported.data.user.id, other.user.id);
  assert.deepEqual(exported.data.entitlements, []);
  assert.ok(!JSON.stringify(exported).includes(winner.user.id));
  assert.equal((await api("/api/v1/account/export", { user: other })).status, 200);
  assert.equal((await api("/api/v1/account/export", { user: other })).status, 200);
  assert.equal((await api("/api/v1/account/export", { user: other })).status, 429);

  assert.equal((await api("/api/v1/auth/logout", { user: winner, method: "POST" })).status, 204);
  assert.equal((await api("/api/v1/me", { user: winner })).data.signed_in, false, "Revoked cookie replay");
  assert.equal((await api("/api/v1/me", { user: other })).data.signed_in, true);
  assert.equal((await api("/api/v1/account", {
    user: other, method: "DELETE", body: { confirm: "HAPUS", user_id: winner.user.id },
  })).status, 422);
  assert.equal((await api("/api/v1/account?user_id=" + winner.user.id, {
    user: other, method: "DELETE", body: { confirm: "HAPUS" },
  })).status, 204);
  userIds.splice(userIds.indexOf(other.user.id), 1);
  assert.equal((await api("/api/v1/me", { user: other })).data.signed_in, false);
  assert.deepEqual(assertSuccess(await admin.from("profiles").select("user_id").eq("user_id", other.user.id)), []);
  assert.equal(assertSuccess(await admin.auth.admin.getUserById(winner.user.id)).user.id, winner.user.id);
  assert.equal(assertSuccess(await admin.from("redeem_codes").select("used").eq("code_hash", codeHash).single()).used, 1);
  const audit = assertSuccess(await admin.from("audit_log").select("action").eq("actor_id", winner.user.id));
  assert.deepEqual(audit.map((event) => event.action).sort(), ["logout", "redeem"]);

  const expired = await createAccount();
  assert.match(expired.sessionId, /^[0-9a-f-]{36}$/);
  execFileSync("docker", ["exec", "-i", "supabase_db_ata", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: "update auth.sessions set not_after = now() - interval '1 second' where id = '" + expired.sessionId + "';",
    stdio: ["pipe", "ignore", "pipe"],
  });
  assert.equal((await api("/api/v1/me", { user: expired })).data.signed_in, false);
  assert.equal((await api("/api/v1/account/export", { user: expired })).status, 401);
  console.log("Uji HTTP R0.1 di Supabase lokal lulus.");
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await admin.from("redeem_codes").delete().eq("code_hash", codeHash);
}
