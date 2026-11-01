const {db,send}=require("./_supabase");
module.exports=async function(req,res){
 if(req.method!=="GET")return send(res,405,{error:"Method not allowed"});
 try{const [clubs,entries]=await Promise.all([db("clubs","select=*&order=team_index.asc.nullslast,name.asc"),db("roster_entries","select=club_id")]);const counts={};for(const x of entries||[])counts[x.club_id]=(counts[x.club_id]||0)+1;return send(res,200,{clubs:(clubs||[]).map(c=>({...c,roster_count:counts[c.id]||0}))});}catch(e){return send(res,e.status||500,{error:e.message});}
};