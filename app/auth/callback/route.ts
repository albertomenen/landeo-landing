import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function GET(request:NextRequest){
  const requestUrl=new URL(request.url);const code=requestUrl.searchParams.get("code");const next=requestUrl.searchParams.get("next")||"/app/jobs";
  const safeNext=next.startsWith("/")&&!next.startsWith("//")?next:"/app/jobs";
  const response=NextResponse.next();
  const providerError=requestUrl.searchParams.get("error_code")||requestUrl.searchParams.get("error");
  if(providerError)return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(providerError)}`,requestUrl.origin));
  if(!code)return NextResponse.redirect(new URL("/login?error=missing_code",requestUrl.origin));
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.redirect(new URL("/login?error=configuration",requestUrl.origin));
  const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const{data,error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.code??"callback")}`,requestUrl.origin));
  const{data:profile,error:profileError}=await supabase.from("profiles").select("onboarding_completed_at").eq("id",data.user.id).maybeSingle();
  // A returning account must not be sent back to signup's onboarding destination.
  // On a transient profile failure, the dashboard remains available for retry.
  const returningNext=/^\/onboarding(?:[/?#]|$)/.test(safeNext)?"/app/jobs":safeNext;
  const destination=profileError?"/app/jobs":profile?.onboarding_completed_at?returningNext:"/onboarding";
  const redirect=NextResponse.redirect(new URL(destination,requestUrl.origin));
  response.cookies.getAll().forEach(cookie=>redirect.cookies.set(cookie));
  return redirect;
}
