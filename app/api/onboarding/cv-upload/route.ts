import { createClient } from "@supabase/supabase-js";

const MAX_FILE_SIZE=10*1024*1024;
const CONTENT_TYPES:Record<string,string>={
  pdf:"application/pdf",
  doc:"application/msword",
  docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function json(body:Record<string,unknown>,status:number){
  return Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
}

export async function POST(request:Request){
  const authorization=request.headers.get("authorization")??"";
  const token=authorization.replace(/^Bearer\s+/i,"").trim();
  if(!token)return json({error:"Authentication required"},401);
  const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)return json({error:"Upload service unavailable"},503);

  const supabase=createClient(url,key,{
    accessToken:async()=>token,
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  });
  const {data:{user},error:userError}=await supabase.auth.getUser(token);
  if(userError||!user)return json({error:"Session expired"},401);

  let form:FormData;
  try{form=await request.formData()}catch{return json({error:"Invalid upload request"},400)}
  const file=form.get("file");
  if(!(file instanceof File))return json({error:"CV file is required"},400);
  const extension=file.name.toLowerCase().split(".").pop()??"";
  const contentType=CONTENT_TYPES[extension];
  if(!contentType)return json({error:"Only PDF, DOC and DOCX files are accepted"},415);
  if(!file.size||file.size>MAX_FILE_SIZE)return json({error:"The CV must be between 1 byte and 10 MB"},413);

  const path=`${user.id}/cv.${extension}`;
  const {error}=await supabase.storage.from("cvs").upload(path,file,{contentType,upsert:true});
  if(error){
    const status=Number(error.statusCode)||503;
    return json({error:status>=500?"Upload service temporarily unavailable":"The CV could not be accepted"},status);
  }
  return json({path},200);
}
