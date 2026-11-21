/** The dashboard can show either the project base URL or the Data API endpoint. */
export function supabaseBaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "");
}
