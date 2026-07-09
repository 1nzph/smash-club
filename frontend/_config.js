// Ficheiro de configuração partilhado por todas as páginas
// Se mudares a porta do backend, só mudas aqui.
const API = "http://localhost:3333";

function getToken(){ return localStorage.getItem('sc_token'); }
function getUser(){ 
  try{ return JSON.parse(localStorage.getItem('sc_user')); } 
  catch(e){ return null; }
}
function setSession(token, user){
  localStorage.setItem('sc_token', token);
  localStorage.setItem('sc_user', JSON.stringify(user));
}
function clearSession(){
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_user');
}
function authHeaders(){
  return { 'Content-Type':'application/json', 'Authorization':'Bearer '+getToken() };
}
function requireAuth(){
  if(!getToken()){ window.location.href='login.html'; return false; }
  return true;
}
function requireClub(){
  const u = getUser();
  if(!u || u.role !== 'CLUB_OWNER'){ window.location.href='dashboard-player.html'; return false; }
  return true;
}
function redirectIfLoggedIn(){
  const u = getUser();
  if(!u) return;
  if(u.role === 'CLUB_OWNER') window.location.href='dashboard-club.html';
  else window.location.href='dashboard-player.html';
}
