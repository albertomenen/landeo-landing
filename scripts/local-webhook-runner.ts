// Starts the stripe-webhook function on port 8001 (it calls Deno.serve without a port).
const serve = Deno.serve.bind(Deno);
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (handler: any) => serve({ port: 8001, hostname: "127.0.0.1" }, handler);
await import("../supabase/functions/stripe-webhook/index.ts");
