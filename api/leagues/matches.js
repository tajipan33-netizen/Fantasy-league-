const {db,send,jsonBody,isAdmin}=require("../_supabase");
module.exports=async function(req,res){
 const q=new URL(req.url,"https://local.invalid").searchParams;const id=q.get("id");
 try{
  if(req.method==="GET"){
   const rows=await db("matches","select=*&order=round_number.asc.nullslast,match_date.asc.nullslast,created_at.asc");
   const clubs=await db("clubs","select=id,name,team_index");const map=Object.fromEntries(clubs.map(c=>[c.id,c.name]));
   return send(res,200,{matches:(rows||[]).map(m=>({...m,home_team:map[m.home_club_id]||m.home_team,away_team:map[m.away_club_id]||m.away_team}))});
  }
  if(!isAdmin(req))return send(res,401,{error:"경기 등록은 운영자 로그인 후 가능합니다."});
  if(req.method==="POST"){
   const b=jsonBody(req);if(!b.home_club_id||!b.away_club_id||b.home_club_id===b.away_club_id)return send(res,400,{error:"서로 다른 홈팀과 원정팀을 선택하세요."});
   const clubs=await db("clubs","select=id,name,team_index&id=in.("+b.home_club_id+","+b.away_club_id+")");
   const home=clubs.find(c=>c.id===b.home_club_id),away=clubs.find(c=>c.id===b.away_club_id);if(!home||!away)return send(res,400,{error:"구단 정보를 확인할 수 없습니다."});
   const row={match_date:b.match_date||null,home_team:home.name,away_team:away.name,home_club_id:home.id,away_club_id:away.id,home_team_index:home.team_index,away_team_index:away.team_index,home_score:b.home_score??null,away_score:b.away_score??null,round_number:b.round_number||null,competition_round:b.round_number?b.round_number+"R":"",venue:b.venue||"",mom:b.mom||"",match_report:b.match_report||"",status:b.home_score==null||b.away_score==null?"scheduled":"completed"};
   const result=await db("matches","select=*",{method:"POST",headers:{Prefer:"return=representation"},body:row});return send(res,201,{match:result[0]||row});
  }
  if(req.method==="PATCH"||req.method==="DELETE"){
   if(!id)return send(res,400,{error:"id is required"});
   if(req.method==="DELETE"){await db("matches","id=eq."+encodeURIComponent(id),{method:"DELETE"});return send(res,200,{ok:true});}
   const b=jsonBody(req),patch={...b};delete patch.id;delete patch.created_at;patch.status=patch.home_score==null||patch.away_score==null?"scheduled":"completed";
   const result=await db("matches","id=eq."+encodeURIComponent(id),{method:"PATCH",headers:{Prefer:"return=representation"},body:patch});return send(res,200,{match:result[0]||null});
  }
  return send(res,405,{error:"Method not allowed"});
 }catch(e){return send(res,e.status||500,{error:e.message,details:e.details});}
};