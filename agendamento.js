// ===== CONFIGURAÇÃO SUPABASE =====
const SUPABASE_URL = "https://upgvfyinupjboovvobdm.supabase.co";
const SUPABASE_KEY = "sb_publishable_YKLtx78hj_0DcAcZIsI9kg_CDdXQD01";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";
document.getElementById("nomeUsuario")?.textContent = usuarioLogado;

let horarioSelecionado = null;
const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");
let agendamentos = [];
let horariosDoDia = [];

// ===== CONFIGURAÇÃO DE DATAS =====
const hoje = new Date();
const hojeStr = hoje.toISOString().split("T")[0];
const maxData = new Date();
maxData.setDate(hoje.getDate() + 5);
dataInput.min = hojeStr;
dataInput.max = maxData.toISOString().split("T")[0];

dataInput.addEventListener("input", () => {
  if (dataInput.value < hojeStr) dataInput.value = hojeStr;
  if (dataInput.value > dataInput.max) dataInput.value = maxData.toISOString().split("T")[0];
  carregarHorariosDoDia(dataInput.value);
  mostrarSepultamentosDia();
});

// ===== CARREGAR AGENDAMENTOS =====
async function carregarAgendamentos() {
  const { data, error } = await supabase.from("agendamentos").select("*");
  if(error) return console.error("Erro ao buscar agendamentos:", error);

  agendamentos = data;
  carregarHorariosDoDia(dataInput.value || hojeStr);
  mostrarSepultamentosDia();
}
carregarAgendamentos();

// ===== CARREGAR HORÁRIOS DO DIA =====
async function carregarHorariosDoDia(data) {
  if(!data) return;
  const { data: horarios, error } = await supabase
    .from("horarios")
    .select("*")
    .eq("data", data)
    .order("hora", { ascending: true });
  if(error) return console.error("Erro ao buscar horários:", error);

  horariosDoDia = horarios;
  gerarHorarios();
}

// ===== GERAR HORÁRIOS =====
function gerarHorarios() {
  const data = dataInput.value;
  if(!data) return;

  const container = document.getElementById("horarios");
  container.innerHTML = "";
  horarioSelecionado = null;

  const ocupados = agendamentos.filter(a => a.Data === data);

  const manha = document.createElement("div");
  const tarde = document.createElement("div");

  horariosDoDia.forEach(h => {
    const div = document.createElement("div");
    div.classList.add("hora");
    div.textContent = h.hora;

    const regOcupado = ocupados.find(a => a.Hora === h.hora);
    if(regOcupado){
      div.classList.add("ocupado");
      if(isAdmin){
        div.onclick = async ()=>{
          if(confirm(`Excluir horário ${h.hora}?`)){
            await supabase.from("agendamentos").delete().eq("id", regOcupado.id);
            carregarAgendamentos();
          }
        };
      }
    } else {
      const dtHorario = new Date(`${data}T${h.hora}:00-03:00`);
      if(data === hojeStr && dtHorario < new Date()) {
        div.classList.add("ocupado");
      } else {
        div.onclick = () => selecionarHorario(div, h.hora);
      }
    }

    if(h.periodo === "manha") manha.appendChild(div);
    else tarde.appendChild(div);
  });

  container.appendChild(manha);
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
  if(!dataInput.value || !horarioSelecionado){
    return alert("Selecione data e horário!");
  }

  if(agendamentos.some(a=>a.Hora===horarioSelecionado && a.Data===dataInput.value)){
    return alert("Este horário já está ocupado!");
  }

  const { error } = await supabase.from("agendamentos").insert([{
    Data: dataInput.value,
    Hora: horarioSelecionado,
    Atendente: usuarioLogado
  }]);

  if(error) return alert("Erro ao agendar: "+error.message);

  alert("Agendamento confirmado!");
  carregarAgendamentos();
  atualizarResumo();
}

// ===== BOTÃO CONFIRMAR =====
document.getElementById("btnConfirmar")?.addEventListener("click", confirmarAgendamento);

// ===== MOSTRAR SEPULTAMENTOS =====
function mostrarSepultamentosDia(){
  const container = document.getElementById("diasCalendario");
  container.innerHTML="";

  for(let i=0;i<5;i++){
    const dia = new Date();
    dia.setDate(hoje.getDate()+i);
    const diaStr = dia.toISOString().split("T")[0];
    const cardDia = document.createElement("div");
    cardDia.classList.add("cardDia");

    const titulo = document.createElement("h4");
    titulo.textContent = "SEPULTAMENTO - "+ dia.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"});
    cardDia.appendChild(titulo);

    const registros = agendamentos.filter(a=>a.Data===diaStr);
    if(registros.length===0){
      const vazio = document.createElement("p"); vazio.textContent="Nenhum agendamento";
      cardDia.appendChild(vazio);
    }

    registros.forEach(a=>{
      const div = document.createElement("div");
      div.classList.add("cardAgendamento");
      div.textContent=`${a.Hora} - ${a.Falecido || "-"}`;
      cardDia.appendChild(div);
    });

    container.appendChild(cardDia);
  }
}

// ===== Atualiza o calendário a cada minuto =====
setInterval(mostrarSepultamentosDia, 60000);
