const {db,send,jsonBody,requireTeamOrAdmin}=require("../_supabase");
module.exports=async function(req,res){
 const q=new URL(req.url,"https://local.invalid").searchParams;const clubId=q.get("club_id");const id=q.get("id");
 try{
  if(req.method==="GET"){
   if(id){const rows=await db("roster_entries","select=*&id=eq."+encodeURIComponent(id));return send(res,200,{player:(rows||[])[0]||null});}
   if(!clubId)return send(res,400,{error:"club_id is required"});
   const rows=await db("roster_entries","select=*&club_id=eq."+encodeURIComponent(clubId)+"&order=entry_type.asc,position.asc,shirt_number.asc.nullslast,name.asc");
   return send(res,200,{players:rows||[]});
  }
  if(req.method==="POST"){
   const body=jsonBody(req);if(!body.club_id||!String(body.name||"").trim())return send(res,400,{error:"구단과 선수 이름을 입력하세요."});
   const auth=requireTeamOrAdmin(req,res,body,body.club_id);if(!auth)return;
   const club=await db("clubs","select=id,team_index&id=eq."+encodeURIComponent(body.club_id));
   if(!club.length)return send(res,404,{error:"구단을 찾을 수 없습니다."});
   if(!auth.admin && Number(club[0].team_index)!==auth.teamIndex)return send(res,403,{error:"본인 구단 선수만 등록할 수 있습니다."});
   const row={club_id:body.club_id,team_index:club[0].team_index,entry_type:"선수",name:String(body.name).trim(),position:String(body.position||""),shirt_number:body.shirt_number===""||body.shirt_number==null?null:Number(body.shirt_number),ovr:Number(body.ovr||70),nationality:String(body.nationality||""),photo_url:String(body.photo_url||""),photo:String(body.photo_url||""),notes:String(body.notes||""),updated_at:new Date().toISOString()};
   const result=await db("roster_entries","select=*",{method:"POST",headers:{Prefer:"return=representation"},body:row});
   return send(res,201,{player:result[0]||row});
  }
  if(req.method==="PATCH"||req.method==="DELETE"){
   if(!id)return send(res,400,{error:"id is required"});
   const existing=await db("roster_entries","select=id,club_id,team_index&id=eq."+encodeURIComponent(id));
   if(!existing.length)return send(res,404,{error:"선수를 찾을 수 없습니다."});
   const auth=requireTeamOrAdmin(req,res,null,existing[0].club_id);if(!auth)return;
   if(!auth.admin&&Number(existing[0].team_index)!==auth.teamIndex)return send(res,403,{error:"본인 구단 선수만 수정할 수 있습니다."});
   if(req.method==="DELETE"){await db("roster_entries","id=eq."+encodeURIComponent(id),{method:"DELETE"});return send(res,200,{ok:true});}
   const body=jsonBody(req);const patch={};
   for(const key of ["name","position","ovr","nationality","photo_url","notes"])if(body[key]!==undefined)patch[key]=body[key];
   if(body.photo_url!==undefined)patch.photo=body.photo_url;
   if(body.shirt_number!==undefined)patch.shirt_number=body.shirt_number===""?null:Number(body.shirt_number);
   patch.updated_at=new Date().toISOString();
   const result=await db("roster_entries","id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:patch});
   return send(res,200,{player:result[0]||null});
  }
  return send(res,405,{error:"Method not allowed"});
 }catch(e){return send(res,e.status||500,{error:e.message,details:e.details});}
};