import {createServerClient} from "@supabase/ssr";
import {NextResponse,type NextRequest} from "next/server";

export async function GET(request:NextRequest){
  const requestUrl=new URL(request.url);const code=requestUrl.searchParams.get("code");const next=requestUrl.searchParams.get("next")||"/app/jobs";
  const safeNext=next.startsWith("/")&&!next.startsWith("//")?next:"/app/jobs";
  const response=NextResponse.redirect(new URL(safeNext,requestUrl.origin));
  if(!code)return NextResponse.redirect(new URL("/login?error=missing_code",requestUrl.origin));
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return NextResponse.redirect(new URL("/login?error=configuration",requestUrl.origin));
  const supabase=createServerClient(url,key,{cookies:{getAll:()=>request.cookies.getAll(),setAll(items){items.forEach(({name,value,options})=>response.cookies.set(name,value,options))}}});
  const{error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.code??"callback")}`,requestUrl.origin));
  return response;
}
