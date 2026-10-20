import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";
import {authDestination,safeAuthNext} from "../../../lib/auth-flow";

export async function GET(request:NextRequest){
  const requestUrl=new URL(request.url);const code=requestUrl.searchParams.get("code");const next=requestUrl.searchParams.get("next")||"/app/jobs";
  const safeNext=safeAuthNext(next);
  const response=NextResponse.next();
  const providerError=requestUrl.searchParams.get("error_code")||requestUrl.searchParams.get("error");
  const fail=(reason:string)=>{
    const target=new URL("/login",requestUrl.origin);target.searchParams.set("error",reason);target.searchParams.set("next",safeNext);
    const redirect=NextResponse.redirect(target);response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));return redirect;
  };
  if(providerError)return fail(providerError);
  if(!code)return fail("missing_code");
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return fail("configuration");
  try{
  const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const{data,error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)return fail(error.code??"callback");
  if(!data.user)return fail("missing_code");
  const{data:profile,error:profileError}=await supabase.from("profiles").select("onboarding_completed_at").eq("id",data.user.id).maybeSingle();
  // A returning account must not be sent back to signup's onboarding destination.
  // On a transient profile failure, the dashboard remains available for retry.
  const destination=authDestination(safeNext,profileError?null:Boolean(profile?.onboarding_completed_at));
  const redirect=NextResponse.redirect(new URL(destination,requestUrl.origin));
  response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
  return redirect;
  }catch{return fail("network")}
}
