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

  // K-23: two different Slots requested at once while one is free. The trigger's per-account lock lets exactly one in.
  const racer = await createAccount();
  const slot = (key, state = "slot") => api("/api/v1/user-competitions/" + key, { user: racer, method: "PUT", body: { state } });
  const activeSlots = async () => assertSuccess(
    await admin.from("user_competitions").select("competition_key").eq("user_id", racer.user.id).eq("state", "slot"),
  ).map((row) => row.competition_key);
  for (let round = 0; round < 5; round++) {
    const keys = ["race-" + round + "-a", "race-" + round + "-b"];
    const pair = await Promise.all(keys.map((key) => slot(key)));
    assert.deepEqual(pair.map((result) => result.status).sort(), [200, 409], "Slot race round " + round);
    const won = keys[pair.findIndex((result) => result.status === 200)];
    assert.deepEqual(await activeSlots(), [won]);
    assert.equal((await slot(won, "released")).status, 200);
  }
  // The same Slot sent twice at once (double click, retry) is one Slot and no false "limit reached".
const twice = await Promise.all([slot("race-same"), slot("race-same")]);
assert.deepEqual(twice.map((result) => result.status), [200, 200], "same Slot twice");
assert.deepEqual(await activeSlots(), ["race-same"]);
assert.equal((await slot("race-same", "released")).status, 200);
assert.deepEqual(await activeSlots(), []);

  // FR-PRG-03: task status per account. XP, level and streak are the server's; repeats and races never count twice.
  const [ana, budi] = [await createAccount(), await createAccount()];
  const plan = (approved = true) => ({ disetujui: approved, langkah: [
    { id: "s1", nama: "Baca panduan", tanggal: "2020-01-01", selesai: true, status: "selesai", selesaiPada: "2020-01-01" },
    { id: "s2", nama: "Kerangka", tanggal: "2999-01-01" },
  ] });
  const task = (user, key, step, status, extra = {}) =>
    api("/api/v1/tasks/" + key + "/" + step, { user, method: "PUT", body: { status, ...extra } });
  const progress = async (user) => (await api("/api/v1/progress", { user })).data;
  const taskRows = async (user) => assertSuccess(await admin.from("task_progress").select("step_id,status,completed_on").eq("user_id", user.user.id).order("step_id"));
  assert.equal((await api("/api/v1/progress")).status, 401);
  assert.equal((await api("/api/v1/tasks/lomba-a/s1", { method: "PUT", body: { status: "done" } })).status, 401);
  assert.equal((await api("/api/v1/user-competitions/lomba-a", { user: ana, method: "PUT", body: { state: "slot", roadmap: plan() } })).status, 200);
  // status a client wrote into the roadmap is dropped: nothing is done yet
  let state = await progress(ana);
  assert.equal(state.summary.xp, 0);
  assert.equal(state.competitions[0].roadmap.langkah[0].selesai, false);
  assert.equal(state.timezone, "Asia/Jakarta");
  // the body carries a status only
  assert.equal((await task(ana, "lomba-a", "s1", "done", { xp: 999 })).status, 422);
  assert.equal((await task(ana, "lomba-a", "s1", "done", { completed_on: "2020-01-01" })).status, 422);
  assert.equal((await task(ana, "lomba-a", "s9", "done")).status, 404);
  assert.equal((await task(ana, "lomba-a", "s1", "done", {}, )).status, 200);
  // six identical requests at once and three more afterwards: one completion, the XP of one late step
  const burst = await Promise.all(Array.from({ length: 6 }, () => task(ana, "lomba-a", "s1", "done")));
  assert.deepEqual(burst.map((r) => r.status), Array(6).fill(200));
  for (let i = 0; i < 3; i++) assert.equal((await task(ana, "lomba-a", "s1", "done")).data.changed, false);
  assert.equal((await taskRows(ana)).length, 1);
  state = await progress(ana);
  assert.equal(state.summary.xp, 5, "late step");
  assert.equal(state.summary.streak, 1);
  // a fresh step raced by eight requests: exactly one of them changes it
  const race = await Promise.all(Array.from({ length: 8 }, () => task(ana, "lomba-a", "s2", "done")));
  assert.equal(race.filter((r) => r.data.changed).length, 1, "one completion out of eight");
  assert.deepEqual((await taskRows(ana)).map((r) => r.status), ["done", "done"]);
  assert.equal((await progress(ana)).summary.xp, 5 + 10 + 20, "late + on time + roadmap finished");
  // done and undone at once: the row ends in one consistent state and the summary agrees with it
  const mixed = await Promise.all(["todo", "done", "todo", "done", "doing"].map((s) => task(ana, "lomba-a", "s2", s)));
  assert.ok(mixed.every((r) => r.status === 200));
  const [, s2] = await taskRows(ana);
  assert.equal(s2.status === "done", s2.completed_on !== null);
  assert.equal((await progress(ana)).summary.xp, s2.status === "done" ? 35 : 5);
  // reversal: the completion and its XP go; the roadmap bonus goes with it
  assert.equal((await task(ana, "lomba-a", "s2", "todo")).status, 200);
  assert.equal((await task(ana, "lomba-a", "s1", "todo")).data.summary.xp, 0);
  assert.equal((await progress(ana)).summary.streak, 0);
  assert.equal((await task(ana, "lomba-a", "s1", "done")).data.summary.xp, 5);
  // a roadmap sent again (Lomba sync) does not touch task status
  assert.equal((await api("/api/v1/user-competitions/lomba-a", { user: ana, method: "PUT", body: { state: "slot", roadmap: plan() } })).data.roadmap.langkah[1].selesai, false);
  assert.equal((await progress(ana)).summary.xp, 5);

  // isolation: Budi has the same competition key and sees and changes only his own
  assert.equal((await task(budi, "lomba-a", "s1", "done")).status, 404);
  assert.equal((await api("/api/v1/user-competitions/lomba-a", { user: budi, method: "PUT", body: { state: "slot", roadmap: plan(false) } })).status, 200);
  assert.equal((await task(budi, "lomba-a", "s1", "done")).status, 409, "roadmap not approved");
  assert.equal((await api("/api/v1/user-competitions/lomba-a", { user: budi, method: "PUT", body: { state: "slot", roadmap: plan() } })).status, 200);
  assert.equal((await task(budi, "lomba-a", "s1", "doing")).status, 200);
  assert.equal((await progress(budi)).summary.xp, 0);
  assert.equal((await progress(ana)).summary.xp, 5);
  assert.deepEqual(assertSuccess(await budi.client.from("task_progress").select("step_id").eq("user_id", ana.user.id)), []);
  assert.equal(assertSuccess(await budi.client.from("task_progress").select("step_id")).length, 1);
  for (const write of [
    budi.client.from("task_progress").update({ status: "done" }).eq("user_id", ana.user.id),
    budi.client.from("task_progress").insert({ user_id: budi.user.id, competition_key: "lomba-a", step_id: "s2", status: "done" }),
    budi.client.from("task_progress").delete().eq("user_id", budi.user.id),
  ]) assert.equal((await write).error?.code, "42501");
  assert.deepEqual((await taskRows(ana)).map((r) => r.status), ["done", "todo"]);
  // timezone: the completion day is the account's calendar day (UTC+14 and UTC-11 are never the same day)
  assertSuccess(await admin.from("profiles").update({ timezone: "Pacific/Kiritimati" }).eq("user_id", ana.user.id));
  assertSuccess(await admin.from("profiles").update({ timezone: "Pacific/Pago_Pago" }).eq("user_id", budi.user.id));
  await task(ana, "lomba-a", "s1", "todo");
  const east = (await task(ana, "lomba-a", "s1", "done")).data;
  const west = (await task(budi, "lomba-a", "s1", "done")).data;
  assert.equal(Date.parse(east.task.completed_on) - Date.parse(west.task.completed_on), 864e5);
  assert.equal(east.today, east.task.completed_on);
  assert.equal(east.summary.streak, 1);
  assert.equal(west.summary.streak, 1);
  // the account export carries the task rows
  const taskExport = (await api("/api/v1/account/export", { user: ana })).data;
  assert.deepEqual(taskExport.task_progress.map((t) => t.step_id), ["s1", "s2"]);
  // removing the competition removes its task rows
  assert.equal((await api("/api/v1/user-competitions/lomba-a", { user: budi, method: "DELETE" })).status < 300, true);
  assert.deepEqual(await taskRows(budi), []);
  console.log("Uji progres per akun (FR-PRG-03) di Supabase lokal lulus.");

  const expired = await createAccount();
  assert.match(expired.sessionId, /^[0-9a-f-]{36}$/);
  execFileSync("docker", ["exec", "-i", "supabase_db_ata", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1"], {
    input: "update auth.sessions set not_after = now() - interval '1 second' where id = '" + expired.sessionId + "';",
    stdio: ["pipe", "ignore", "pipe"],
  });
  assert.equal((await api("/api/v1/me", { user: expired })).data.signed_in, false);
  assert.equal((await api("/api/v1/account/export", { user: expired })).status, 401);
  console.log("Uji HTTP R0.1 dan balapan Slot (K-23) di Supabase lokal lulus.");
} finally {
  for (const id of userIds) await admin.auth.admin.deleteUser(id);
  await admin.from("redeem_codes").delete().eq("code_hash", codeHash);
}
