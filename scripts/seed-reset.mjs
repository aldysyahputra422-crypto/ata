// `pnpm seed:reset` (DEMO-04): restores all demo data. Stub until the demo accounts and
// SeedAdapter exist (Hari 3-4). It refuses to run outside demo mode so it can never touch real data.
if (process.env.DEMO_MODE !== "true") {
  console.error("seed:reset hanya berjalan bila DEMO_MODE=true.");
  process.exit(1);
}
console.log("seed:reset belum diimplementasikan (lihat docs/STATUS.md, DEMO-04).");
