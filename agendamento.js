// ===== CONFIGURAÇÃO =====
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];
const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";

// Nome do usuário no topo
document.getElementById("nomeUsuario").textContent = usuarioLogado;

// ===== VARIÁVEIS =====
let horarioSelecionado = null;
const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");
let agendamentos = [];

// ===== LIMITAR GAVETAS =====
const gavetasInput = document.getElementById("gavetas");
gavetasInput.addEventListener("blur", ()=> {
  let valor = parseInt(gavetasInput.value) || 1;
  if (valor > 3) valor = 3;
  if (valor < 1) valor = 1;
  gavetasInput.value = valor;
  atualizarResumo();
});

// ===== CONFIGURAÇÕES DE DATA =====
const hoje = new Date();
const hojeStr = hoje.toISOString().split("T")[0];
const maxData = new Date();
maxData.setDate(hoje.getDate() + 5);
dataInput.min = hojeStr;
dataInput.max = maxData.toISOString().split("T")[0];

dataInput.addEventListener("input", () => {
  if (dataInput.value < hojeStr) dataInput.value = hojeStr;
  if (dataInput.value > dataInput.max) dataInput.value = dataInput.max;
});

// ===== SUPABASE =====
const SUPABASE_URL = "COLE_AQUI_SUA_URL";
const SUPABASE_KEY = "COLE_AQUI_SUA_ANON_KEY";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ===== FUNÇÕES SUPABASE =====
async function buscarAgendamentos(data){
  const { data: registros, error } = await supabase
    .from('agendamentos')
    .select('*')
    .eq('data', data)
    .order('hora', { ascending: true });
  if(error) console.error(error);
  return registros || [];
}

async function salvarAgendamentoSupabase(ag){
  const { data, error } = await supabase
    .from('agendamentos')
    .insert([ag]);
  if(error) console.error(error);
}

async function excluirAgendamento(id){
  const { error } = await supabase
    .from('agendamentos')
    .delete()
    .eq('id', id);
  if(error) console.error(error);
}

// ===== TEMPO REAL =====
supabase
  .channel('realtime-agendamentos')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, payload => {
    mostrarSepultamentosDia();
    gerarHorarios();
  })
  .subscribe();

// ===== LIMPAR AGENDAMENTOS EXPIRADOS =====
async function limparAgendamentosExpirados(){
  const agora = new Date();
  for(const ag of agendamentos){
    const [h,m] = ag.hora.split(":").map(Number);
    const dt = new Date(ag.data);
    dt.setHours(h,m,0,0);
    dt.setDate(dt.getDate()+1);
    if(dt <= agora){
      await excluirAgendamento(ag.id);
    }
  }
}

// ===== EVENTOS =====
dataInput.addEventListener("change", ()=>{
  gerarHorarios();
  mostrarSepultamentosDia();
});

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
      div.dataset.tooltip = ${regOcupado.falecido} (${regOcupado.pendencias}) - ${regOcupado.atendente};  
      if(isAdmin){  
        div.onclick = async () => {  
          if(confirm(Excluir horário ${hora}?)){  
            await excluirAgendamento(regOcupado.id);
            gerarHorarios(); 
            mostrarSepultamentosDia();  
          }  
        };  
      }  
    } else {  
      const dtHorario = new Date(${data}T${hora}:00-03:00);
      if(data === hojeStr && dtHorario < new Date()){   
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
  const contrato = document.getElementById("contrato").value || "-";
  let gavetas = parseInt(document.getElementById("gavetas").value) || "-";
  if(gavetas > 3) gavetas = 3;
  resumoEl.innerHTML= `
    <h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Falecido:</b> ${document.getElementById("falecido").value||"-"}</p>
    <p><b>Titular:</b> ${document.getElementById("titular").value||"-"}</p>
    <p><b>Nº do contrato:</b> ${contrato} - "${gavetas} ${gavetas == 1 ? 'gaveta' : 'gavetas'}"</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>
    <button onclick="enviarWhatsApp()">Enviar para WhatsApp</button>
  `;
}

// ===== ENVIAR PARA WHATSAPP =====
function enviarWhatsApp() {
  const resumoTexto = resumoEl.innerText; 
  const numero = "55SEUNUMEROAQUI";
  const url = https://wa.me/${numero}?text=${encodeURIComponent(resumoTexto)};
  window.open(url, "_blank");
}

// ===== CONFIRMAR AGENDAMENTO =====
async function confirmarAgendamento(){
  const data = dataInput.value;
  const falecido = document.getElementById("falecido").value.trim();
  const contrato = document.getElementById("contrato").value;
  let gavetas = parseInt(document.getElementById("gavetas").value) || 1;
  if(gavetas > 3) gavetas = 3;
  const titular = document.getElementById("titular").value;
  const pendencias = document.getElementById("pendencias").value;
  const descPendencia = document.getElementById("descPendencia").value;
  const exumacao = document.getElementById("exumacao").value;
  const setor = document.getElementById("setor").value;

  if(!data || !horarioSelecionado || !falecido){
    alert("Preencha todos os campos e selecione um horário!");
    return;
  }

  if(agendamentos.some(a=>a.falecido.toLowerCase() === falecido.toLowerCase())){
    alert("Este falecido já está agendado!");
    return;
  }

  const ag = {
    data,
    hora: horarioSelecionado,
    falecido,
    contrato,
    gavetas,
    titular,
    pendencias,
    descPendencia,
    exumacao,
    setor,
    atendente: usuarioLogado
  };

  await salvarAgendamentoSupabase(ag);
  gerarHorarios(); 
  mostrarSepultamentosDia(); 
  atualizarResumo();
}

// ===== MOSTRAR SEPULTAMENTOS =====
async function mostrarSepultamentosDia(){
  await limparAgendamentosExpirados();
  const container = document.getElementById("diasCalendario");
  container.innerHTML="";

  for(let i=0;i<5;i++){
