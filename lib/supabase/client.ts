import {createBrowserClient} from "@supabase/ssr";
import type {Session} from "@supabase/supabase-js";

let browserClient:ReturnType<typeof createBrowserClient>|null=null;

export type OAuthProviderAvailability={google:boolean;apple:boolean};

export function createSupabaseBrowserClient(){
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)throw new Error("Supabase web no está configurado.");
  browserClient??=createBrowserClient(url,key);
  return browserClient;
}

export async function getOAuthProviderAvailability():Promise<OAuthProviderAvailability>{
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return{google:false,apple:false};
  try{
    const response=await fetch(`${url}/auth/v1/settings`,{headers:{apikey:key},cache:"no-store"});
    if(!response.ok)return{google:false,apple:false};
    const settings=await response.json() as {external?:Record<string,boolean>};
    // Supabase may report a provider as enabled even when its OAuth secret is
    // missing. Only expose providers that are both healthy in Supabase and
    // explicitly enabled in this deployment.
    return{
      google:settings.external?.google===true&&process.env.NEXT_PUBLIC_GOOGLE_OAUTH_ENABLED==="true",
      apple:settings.external?.apple===true&&process.env.NEXT_PUBLIC_APPLE_OAUTH_ENABLED==="true",
    };
  }catch{return{google:false,apple:false}}
}

const AUTH_RETRY_DELAYS_MS=[0,350,900];

export async function getResilientSession(minimumValiditySeconds=120):Promise<Session|null>{
  const client=createSupabaseBrowserClient();
  let lastError:Error|null=null;
  let confirmedMissing=false;
  for(const delay of AUTH_RETRY_DELAYS_MS){
    if(delay)await new Promise(resolve=>setTimeout(resolve,delay));
    const{data,error}=await client.auth.getSession();
    if(error){lastError=error;continue}
    if(!data.session){confirmedMissing=true;continue}
    const expiresAt=(data.session.expires_at??0)*1000;
    if(!expiresAt||expiresAt-Date.now()>minimumValiditySeconds*1000)return data.session;
    const{data:refreshed,error:refreshError}=await client.auth.refreshSession(data.session);
    if(refreshed.session)return refreshed.session;
    if(refreshError)lastError=refreshError;
    if(expiresAt>Date.now())return data.session;
  }
  if(lastError&&!confirmedMissing)throw lastError;
  return null;
}
