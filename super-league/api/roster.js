const {db,send,jsonBody,authTeam}=require("./_supabase");
module.exports=async function(req,res){
 const q=new URL(req.url,"https://local.invalid").searchParams,clubId=q.get("club_id"),id=q.get("id");
 try{
  if(req.method==="GET"){
   if(id){const rows=await db("roster_entries","select=*&id=eq."+encodeURIComponent(id));return send(res,200,{player:rows[0]||null});}
   if(!clubId)return send(res,400,{error:"club_id is required"});
   const rows=await db("roster_entries","select=*&club_id=eq."+encodeURIComponent(clubId)+"&order=entry_type.asc,position.asc,shirt_number.asc.nullslast,name.asc");
   return send(res,200,{players:rows||[]});
  }
  if(req.method==="POST"){
   const b=jsonBody(req);if(!b.club_id||!String(b.name||"").trim())return send(res,400,{error:"구단과 선수 이름을 입력하세요."});
   const clubs=await db("clubs","select=id,name,team_index&id=eq."+encodeURIComponent(b.club_id));if(!clubs.length)return send(res,404,{error:"구단을 찾을 수 없습니다."});
   const auth=authTeam(req,res,clubs[0]);if(!auth)return;
   const row={club_id:b.club_id,team_index:clubs[0].team_index,entry_type:"선수",name:String(b.name).trim(),position:String(b.position||""),shirt_number:b.shirt_number===""||b.shirt_number==null?null:Number(b.shirt_number),ovr:Number(b.ovr||70),nationality:String(b.nationality||""),photo_url:String(b.photo_url||""),photo:String(b.photo_url||""),notes:String(b.notes||""),updated_at:new Date().toISOString()};
   const out=await db("roster_entries","select=*",{method:"POST",headers:{Prefer:"return=representation"},body:row});return send(res,201,{player:out[0]||row});
  }
  if(req.method==="PATCH"||req.method==="DELETE"){
   if(!id)return send(res,400,{error:"id is required"});
   const existing=await db("roster_entries","select=id,club_id,team_index&id=eq."+encodeURIComponent(id));if(!existing.length)return send(res,404,{error:"선수를 찾을 수 없습니다."});
   const club={id:existing[0].club_id,team_index:existing[0].team_index};const auth=authTeam(req,res,club);if(!auth)return;
   if(req.method==="DELETE"){await db("roster_entries","id=eq."+encodeURIComponent(id),{method:"DELETE"});return send(res,200,{ok:true});}
   const b=jsonBody(req),patch={};for(const k of ["name","position","ovr","nationality","photo_url","notes"])if(b[k]!==undefined)patch[k]=b[k];
   if(b.photo_url!==undefined)patch.photo=b.photo_url;if(b.shirt_number!==undefined)patch.shirt_number=b.shirt_number===""?null:Number(b.shirt_number);
   patch.updated_at=new Date().toISOString();const out=await db("roster_entries","id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:patch});return send(res,200,{player:out[0]||null});
  }
  return send(res,405,{error:"Method not allowed"});
 }catch(e){return send(res,e.status||500,{error:e.message});}
};