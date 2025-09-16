// ===== CONFIGURAÇÃO =====
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];
const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";

// Supabase
const supabaseUrl = "https://upgvfyinupjboovvobdm.supabase.co";
const supabaseKey = "sb_publishable_YKLtx78hj_0DcAcZIsI9kg_CDdXQD01";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Nome do usuário no topo
document.getElementById("nomeUsuario").textContent = usuarioLogado;

// ===== VARIÁVEIS =====
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

// ===== LIMITAR GAVETAS =====
const gavetasInput = document.getElementById("gavetas");
gavetasInput.addEventListener("blur", ()=> {
  let valor = parseInt(gavetasInput.value) || 1;
  if (valor > 3) valor = 3;
  if (valor < 1) valor = 1;
  gavetasInput.value = valor;
  atualizarResumo();
});

// ===== FUNÇÕES SUPABASE =====

// Buscar agendamentos do Supabase
async function buscarAgendamentos() {
  const { data, error } = await supabase
    .from("agendamentos")
    .select("*");
  if (error) {
    console.error(error);
    return;
  }
  agendamentos = data;
  gerarHorarios();
  mostrarSepultamentosDia();
}

// Inserir agendamento
async function salvarAgendamento(ag) {
  const { error } = await supabase
    .from("agendamentos")
    .insert([ag]);
  if (error) {
    alert("Erro ao salvar agendamento!");
    console.error(error);
  } else {
    await buscarAgendamentos();
  }
}

// Excluir agendamento
async function excluirAgendamento(ag) {
  const { error } = await supabase
    .from("agendamentos")
    .delete()
    .eq("id", ag.id);
  if (error) {
    alert("Erro ao excluir agendamento!");
    console.error(error);
  } else {
    await buscarAgendamentos();
  }
}

// ===== LIMPAR AGENDAMENTOS EXPIRADOS =====
function limparAgendamentosExpirados() {
  const agora = new Date();
  agendamentos = agendamentos.filter(a => {
    const [h,m] = a.Hora.split(":").map(Number);
    const dt = new Date(a.Data);
    dt.setHours(h,m,0,0);
    dt.setDate(dt.getDate()+1);
    return dt > agora;
  });
}

// ===== GERAR HORÁRIOS =====
function gerarHorarios() {
  const data = dataInput.value;
  const container = document.getElementById("horarios");
  container.innerHTML = "";
  horarioSelecionado = null;
  if(!data) return;

  const ocupados = agendamentos.filter(a=>a.Data===data);

  function criarHorarioDiv(hora){
    const div = document.createElement("div");
    div.classList.add("hora");
    div.textContent = hora;

    const regOcupado = ocupados.find(r => r.Hora === hora);
    if(regOcupado){
      div.classList.add("ocupado");
      div.title = `${regOcupado.Falecido} (${regOcupado.Pendencias}) - ${regOcupado.Atendente}`;
      if(isAdmin){
        div.onclick = async () => {
          if(confirm(`Excluir horário ${hora}?`)){
            await excluirAgendamento(regOcupado);
          }
        };
      }
    } else {
      const dtHorario = new Date(`${data}T${hora}:00-03:00`);
      if(data === hojeStr && dtHorario < new Date()){
        div.classList.add("ocupado");
        div.title = "Horário passado";
      } else {
        div.onclick = () => selecionarHorario(div,hora);
      }
    }

    return div;
  }

  const manha = document.createElement("div");
  manha.style.marginBottom="10px";
  horariosManha.forEach(h => manha.appendChild(criarHorarioDiv(h)));
  container.appendChild(manha);

  const tarde = document.createElement("div");
  horariosTarde.forEach(h => tarde.appendChild(criarHorarioDiv(h)));
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
  if(gavetas > 3) gavetas = 3;
  resumoEl.innerHTML = `
    <h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Falecido:</b> ${document.getElementById("falecido").value||"-"}</p>
    <p><b>Titular:</b> ${document.getElementById("titular").value||"-"}</p>
    <p><b>Nº do contrato:</b> ${contrato} - ${gavetas} ${gavetas==1?"gaveta":"gavetas"}</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>
    <button onclick="enviarWhatsApp()">Enviar para WhatsApp</button>
  `;
}

// ===== CONFIRMAR AGENDAMENTO =====
async function confirmarAgendamento(){
  const data = dataInput.value;
  const falecido = document.getElementById("falecido").value.trim();
  const contrato = document.getElementById("contrato").value;
  let gavetas = parseInt(document.getElementById("gavetas").value) || 1;
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

  if(agendamentos.some(a => a.Falecido.toLowerCase() === falecido.toLowerCase())){
    alert("Este falecido já está agendado!");
    return;
  }

  const novoAg = {
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
  };

  await salvarAgendamento(novoAg);
}

// ===== INICIALIZAÇÃO =====
buscarAgendamentos();
