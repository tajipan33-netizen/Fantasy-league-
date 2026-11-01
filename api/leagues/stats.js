const {db,send}=require("../_supabase");
module.exports=async function(req,res){
 if(req.method!=="GET")return send(res,405,{error:"Method not allowed"});
 try{
  const [clubs,entries]=await Promise.all([db("clubs","select=id,name,team_index"),db("roster_entries","select=name,club_id,team_index,entry_type")]);
  const matches=await db("matches","select=home_team,away_team,home_score,away_score,scorers,assists,saves,mom,status");
  const map=Object.fromEntries(clubs.map(c=>[c.id,c.name]));const totals={};
  const add=(name,club,value)=>{if(!name||!club)return;const key=club+"|"+name;totals[key]||={name,club_name:map[club]||"—",goals:0,assists:0,saves:0};totals[key][value.kind]+=Number(value.amount)||0};
  for(const m of matches||[]){for(const kind of ["scorers","assists","saves"]){const arr=Array.isArray(m[kind])?m[kind]:[];for(const v of arr){const club=clubs.find(c=>c.name===v.club||c.name===v.team);if(club)add(v.name||v.player,club.id,{kind:kind==="scorers"?"goals":kind==="assists"?"assists":"saves",amount:v.count||1})}}}
  return send(res,200,{stats:Object.values(totals)});
 }catch(e){return send(res,e.status||500,{error:e.message});}
};