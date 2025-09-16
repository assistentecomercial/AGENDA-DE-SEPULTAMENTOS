// ===== CONFIGURAÇÃO =====
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];

let usuarioLogado = null;  // vai guardar objeto do atendente logado
let isAdmin = false;
let horarioSelecionado = null;

const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");
let agendamentos = [];

// ===== SUPABASE =====
const SUPABASE_URL = "https://upgvfyinupjboovvobdm.supabase.co";
const SUPABASE_KEY = "sb_publishable_YKLtx78hj_0DcAcZIsI9kg_CDdXQD01"; // use sua publishable key
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== LOGIN =====
async function fazerLogin() {
  const nome = document.getElementById("usuario").value.trim();
  const senha = document.getElementById("senha").value.trim();

  if (!nome || !senha) {
    alert("Preencha usuário e senha!");
    return;
  }

  const { data, error } = await supabase
    .from("atendentes")
    .select("*")
    .eq("nome", nome)
    .eq("senha", senha)
    .single();

  if (error || !data) {
    alert("Usuário ou senha incorretos!");
    return;
  }

  usuarioLogado = data.nome;
  isAdmin = data.papel === "admin";

  localStorage.setItem("usuarioLogado", usuarioLogado);
  localStorage.setItem("isAdmin", isAdmin);

  document.getElementById("loginBox").style.display = "none";
  document.getElementById("agendaBox").style.display = "block";

  document.getElementById("nomeUsuario").textContent = usuarioLogado;

  gerarHorarios();
}

// ===== BUSCAR AGENDAMENTOS =====
async function buscarAgendamentos(data){
  const { data: registros, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', data)
    .order('hora', { ascending: true });
  if(error) console.error(error);
  return registros || [];
}

// ===== SALVAR AGENDAMENTO =====
async function salvarAgendamentoSupabase(ag){
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([ag]);
  if(error) console.error(error);
}

// ===== EXCLUIR AGENDAMENTO =====
async function excluirAgendamento(id){
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id);
  if(error) console.error(error);
}

// ===== GERAR HORÁRIOS =====
async function gerarHorarios(){
  const data = dataInput.value;
  const container = document.getElementById("horarios");
  container.innerHTML="";
  horarioSelecionado = null;
  if(!data) return;

  agendamentos = await buscarAgendamentos(data);

  function criarHorarioDiv(hora, periodo){
    const div = document.createElement("div");
    div.classList.add("hora", periodo);
    div.textContent = hora;

    const regOcupado = agendamentos.find(r=>r.hora===hora);  
    if(regOcupado){  
      div.classList.add("ocupado");  
      div.dataset.tooltip = `${regOcupado.falecido || "-"} (${regOcupado.pendencias || "-"}) - ${regOcupado.atendente}`;  
      if(isAdmin){  
        div.onclick = async () => {  
          if(confirm(`Excluir horário ${hora}?`)){  
            await excluirAgendamento(regOcupado.id);
            gerarHorarios();  
          }  
        };  
      }  
    } else {  
      const dtHorario = new Date(`${data}T${hora}:00-03:00`);
      const hoje = new Date();
      const hojeStr = hoje.toISOString().split("T")[0];
      if(data === hojeStr && dtHorario < hoje){   
        div.classList.add("ocupado");  
        div.dataset.tooltip = "Horário passado";  
      } else {  
        div.onclick = () => selecionarHorario(div,hora);  
      }  
    }  
    return div;
  }

  const manha = document.createElement("div");
  manha.style.marginBottom="10px";
  horariosManha.forEach(h=>manha.appendChild(criarHorarioDiv(h,"manha")));
  container.appendChild(manha);

  const tarde = document.createElement("div");
  horariosTarde.forEach(h=>tarde.appendChild(criarHorarioDiv(h,"tarde")));
  container.appendChild(tarde);
}

// ===== SELECIONAR HORÁRIO =====
function selecionarHorario(div,hora){
  document.querySelectorAll(".hora").forEach(h=>h.classList.remove("selecionado"));
  div.classList.add("selecionado");
  horarioSelecionado = hora;
  atualizarResumo();
}

// ===== ATUALIZAR RESUMO =====
function atualizarResumo(){
  resumoEl.innerHTML = `
    <h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>
  `;
}

// ===== CONFIRMAR AGENDAMENTO =====
async function confirmarAgendamento(){
  const data = dataInput.value;
  if(!data || !horarioSelecionado){
    alert("Selecione data e horário!");
    return;
  }

  const ag = {
    data,
    hora: horarioSelecionado,
    atendente: usuarioLogado
  };

  await salvarAgendamentoSupabase(ag);
  alert(`✅ Agendamento confirmado: ${horarioSelecionado}`);
  gerarHorarios();
  atualizarResumo();
}

// ===== TEMPO REAL =====
supabase
  .channel('realtime-agendamentos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, payload => {
    gerarHorarios();
  })
  .subscribe();

// ===== EVENTOS =====
dataInput.addEventListener("change", gerarHorarios);
