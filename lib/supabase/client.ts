import {createBrowserClient} from "@supabase/ssr";

let browserClient:ReturnType<typeof createBrowserClient>|null=null;

export function createSupabaseBrowserClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase web no está configurado.");
  browserClient??=createBrowserClient(url,key);
  return browserClient;
}
