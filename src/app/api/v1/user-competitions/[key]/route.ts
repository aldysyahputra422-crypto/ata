import { NextResponse } from "next/server";
import { accountError, accountSession, accountUnavailable, checkOrigin, needsSignIn, parseJsonBody, privateHeaders } from "@/lib/account/http";
import { competitionBodyBytes, competitionColumns, competitionInput, competitionKey } from "@/lib/account/competitions";
import { readProgress, stripProgress, withProgress } from "@/lib/account/progress";

type Context = { params: Promise<{ key: string }> };

async function prepare(request: Request, context: Context) {
  const forbidden = checkOrigin(request);
  if (forbidden) return { response: forbidden } as const;
  const session = await accountSession();
  if (session.state === "unavailable") return { response: accountUnavailable() } as const;
  if (session.state === "signed_out") return { response: needsSignIn() } as const;
  const key = competitionKey.safeParse((await context.params).key);
  if (!key.success) return { response: accountError(422, "validation", "Lomba tidak dikenali.") } as const;
  return { session, key: key.data } as const;
}

/** Creates or updates one competition of the account. The database trigger decides whether a new Slot fits the plan. */
export async function PUT(request: Request, context: Context) {
  const ready = await prepare(request, context);
  if (ready.response) return ready.response;

  const body = competitionInput.safeParse(await parseJsonBody(request, competitionBodyBytes));
  if (!body.success) return accountError(422, "validation", "Data lomba tidak valid.");

  // Step status is not part of the roadmap document: it is set through /api/v1/tasks and dropped here.
  // Omitted card/roadmap keep their stored value; an explicit null clears them.
  const { state, source, card, roadmap } = body.data;
  const values = { state, source, ...(card === undefined ? {} : { card }), ...(roadmap === undefined ? {} : { roadmap: stripProgress(roadmap) }) };
  const table = () => ready.session.client.from("user_competitions");
  // Not an upsert: ON CONFLICT DO UPDATE would need UPDATE on competition_key (not granted) and would run the
  // insert trigger first, which refuses an existing Slot at capacity. Update the row, insert only when there is none.
  const update = () => table().update(values).eq("competition_key", ready.key).select(competitionColumns).maybeSingle();
  let { data, error } = await update();
  if (!error && !data) {
    ({ data, error } = await table().insert({ competition_key: ready.key, ...values }).select(competitionColumns).single());
    // Another request created the row meanwhile. For a Slot the insert trigger runs before the unique check, so the
    // duplicate is refused as slot_limit_reached: update the existing row, and keep the refusal when there is none.
    if (error?.code === "23505" || error?.message?.includes("slot_limit_reached")) {
      const again = await update();
      if (again.error || again.data) ({ data, error } = again);
    }
  }
  if (error?.message?.includes("slot_limit_reached")) {
    return accountError(409, "limit_reached", "Slot aktif sudah mencapai batas paketmu. Lepas satu Slot dulu.");
  }
  if (error?.code === "42501") return needsSignIn();
  if (error?.code === "23514") return accountError(422, "validation", "Data lomba tidak valid.");
  if (error || !data) return accountUnavailable();
  const progress = await readProgress(ready.session.client);
  if (!progress) return accountUnavailable();
  return NextResponse.json({ ...data, roadmap: withProgress(data.competition_key, data.roadmap, progress.tasks) }, { headers: privateHeaders });
}

export async function DELETE(request: Request, context: Context) {
  const ready = await prepare(request, context);
  if (ready.response) return ready.response;

  const { error } = await ready.session.client.from("user_competitions").delete().eq("competition_key", ready.key);
  if (error?.code === "42501") return needsSignIn();
  if (error) return accountUnavailable();
  return new NextResponse(null, { status: 204, headers: privateHeaders });
}
