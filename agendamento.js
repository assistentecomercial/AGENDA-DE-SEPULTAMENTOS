// ===== CONFIGURAÇÃO =====
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];
const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";

document.getElementById("nomeUsuario")?.textContent = usuarioLogado;

// ===== SUPABASE =====
const SUPABASE_URL = "https://SEU_PROJECT.supabase.co";
const SUPABASE_KEY = "sb_publishable_XXXX"; // substitua pela sua
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let horarioSelecionado = null;
const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");
let agendamentos = [];

// ===== CONFIGURAÇÃO DE DATAS =====
const hoje = new Date();
const hojeStr = hoje.toISOString().split("T")[0];
const maxData = new Date();
maxData.setDate(hoje.getDate() + 5);
dataInput.min = hojeStr;
dataInput.max = maxData.toISOString().split("T")[0];

dataInput.addEventListener("input", () => {
  if (dataInput.value < hojeStr) dataInput.value = hojeStr;
  if (dataInput.value > dataInput.max) dataInput.value = dataInput.max;
  gerarHorarios();
  mostrarSepultamentosDia();
});

// ===== CARREGAR AGENDAMENTOS DO SUPABASE =====
async function carregarAgendamentos() {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*");

  if(error){
    console.error("Erro ao buscar agendamentos:", error);
    alert("Não foi possível carregar agendamentos!");
    return;
  }

  agendamentos = data;
  gerarHorarios();
  mostrarSepultamentosDia();
}

carregarAgendamentos();

// ===== GERAR HORÁRIOS =====
function gerarHorarios(){
  const data = dataInput.value;
  const container = document.getElementById("horarios");
  container.innerHTML="";
  horarioSelecionado = null;
  if(!data) return;

  const ocupados = agendamentos.filter(a=>a.Data===data);

  function criarHorarioDiv(hora){
    const div = document.createElement("div");
    div.classList.add("hora");
    div.textContent = hora;

    const regOcupado = ocupados.find(r=>r.Hora===hora);
    if(regOcupado){
      div.classList.add("ocupado");
      div.dataset.tooltip = `${regOcupado.Falecido} (${regOcupado.Pendencias}) - ${regOcupado.Atendente}`;
      if(isAdmin){
        div.onclick = async ()=>{
          if(confirm(`Excluir horário ${hora}?`)){
            await supabase.from("agendamentos").delete().eq("id", regOcupado.id);
            carregarAgendamentos();
          }
        };
      }
    } else {
      const dtHorario = new Date(`${data}T${hora}:00-03:00`);
      if(data===hojeStr && dtHorario < new Date()) {
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
  horariosManha.forEach(h=>manha.appendChild(criarHorarioDiv(h)));
  container.appendChild(manha);

  const tarde = document.createElement("div");
  horariosTarde.forEach(h=>tarde.appendChild(criarHorarioDiv(h)));
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
  const contrato = document.getElementById("contrato").value || "-";
  let gavetas = parseInt(document.getElementById("gavetas").value) || "-";
  if(gavetas>3) gavetas=3;

  resumoEl.innerHTML = `
    <h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Falecido:</b> ${document.getElementById("falecido").value||"-"}</p>
    <p><b>Titular:</b> ${document.getElementById("titular").value||"-"}</p>
    <p><b>Nº do contrato:</b> ${contrato} - "${gavetas} ${gavetas==1?'gaveta':'gavetas'}"</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>
  `;
}

// ===== CONFIRMAR AGENDAMENTO =====
async function confirmarAgendamento(){
  const data = dataInput.value;
  const falecido = document.getElementById("falecido").value.trim();
  const contrato = document.getElementById("contrato").value;
  let gavetas = parseInt(document.getElementById("gavetas").value)||1;
  if(gavetas>3) gavetas=3;
  const titular = document.getElementById("titular").value;
  const pendencias = document.getElementById("pendencias").value;
  const descPendencia = document.getElementById("descPendencia").value;
  const exumacao = document.getElementById("exumacao").value;
  const setor = document.getElementById("setor").value;

  if(!data || !horarioSelecionado || !falecido){
    alert("Preencha todos os campos e selecione um horário!");
    return;
  }

  if(agendamentos.some(a=>a.Hora===horarioSelecionado && a.Data===data)){
    alert("Este horário já está ocupado!");
    return;
  }

  const { data: novoAgendamento, error } = await supabase
    .from("agendamentos")
    .insert([{
      Data: data,
      Hora: horarioSelecionado,
      Falecido: falecido,
      Contrato: contrato,
      Gavetas: gavetas,
      Titular: titular,
      Pendencias: pendencias,
      DescPendencia: descPendencia,
      Exumacao: exumacao,
      Setor: setor,
      Atendente: usuarioLogado
    }])
    .select()
    .single();

  if(error){
    console.error("Erro ao salvar agendamento:", error);
    alert("Não foi possível salvar o agendamento!");
    return;
  }

  carregarAgendamentos();
  atualizarResumo();
}

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
      div.textContent=`${a.Hora} - ${a.Falecido}`;
      cardDia.appendChild(div);
    });

    container.appendChild(cardDia);
  }
}
