import { request } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import { Readable } from "node:stream";
import type { Http } from "./providers";
import { addressBlocked, systemResolve, type Resolve } from "./ssrf";

// FR-BYOK-04: checkBaseUrl resolves a custom host before the request, but a plain fetch would resolve it
// again and could be handed a different, private address (DNS rebinding). Requests to a custom base URL
// therefore go through this transport: the address check runs inside the socket's own lookup, so the
// address that was checked is the address that is connected to. The request still names the host, so
// TLS SNI and certificate validation are unchanged.

export class BlockedAddressError extends Error {
  readonly code = "EBLOCKEDADDRESS";
  constructor() {
    super("address not allowed");
  }
}

/** A socket lookup that only ever returns public addresses; one private address in the answer fails the connection. */
export function guardedLookup(resolve: Resolve = systemResolve): LookupFunction {
  return (hostname, options, callback) => {
    resolve(hostname).then(
      (addresses) => {
        if (!addresses.length || addresses.some(addressBlocked)) return callback(new BlockedAddressError(), "", 0);
        const wanted = options.family === 4 || options.family === 6 ? options.family : 0;
        const list = addresses.map((address) => ({ address, family: isIP(address) })).filter((a) => !wanted || a.family === wanted);
        if (!list.length) return callback(new BlockedAddressError(), "", 0);
        if (options.all) callback(null, list);
        else callback(null, list[0].address, list[0].family);
      },
      (error: unknown) => callback(error instanceof Error ? error : new Error("lookup failed"), "", 0),
    );
  };
}

/** `Http` for custom base URLs. https only, never follows redirects, never reuses a connection. */
export function pinnedHttp(resolve: Resolve = systemResolve): Http {
  const lookup = guardedLookup(resolve);
  return (input, init) =>
    new Promise<Response>((done, fail) => {
      const url = new URL(input);
      const host = url.hostname.replace(/^\[|\]$/g, "");
      // An IP literal skips the lookup, so it is checked here.
      if (url.protocol !== "https:" || (isIP(host) && addressBlocked(host))) return fail(new BlockedAddressError());
      const body = typeof init.body === "string" ? init.body : undefined;
      const headers = Object.fromEntries(new Headers(init.headers).entries());
      const req = request(
        url,
        { method: init.method ?? "GET", headers, lookup, agent: false, signal: init.signal ?? undefined },
        (res) => {
          const status = res.statusCode ?? 502;
          const out = new Headers();
          for (const [name, value] of Object.entries(res.headers)) {
            if (value !== undefined) out.set(name, Array.isArray(value) ? value.join(", ") : value);
          }
          const empty = status === 204 || status === 304 || init.method === "HEAD";
          if (empty) res.resume();
          done(new Response(empty ? null : (Readable.toWeb(res) as ReadableStream<Uint8Array>), { status, headers: out }));
        },
      );
      req.on("error", fail);
      req.end(body);
    });
}
