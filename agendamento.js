// ===== CONFIGURAÇÃO =====
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];
const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";

// Nome do usuário no topo
document.getElementById("nomeUsuario").textContent = usuarioLogado;

// ===== SUPABASE =====
const SUPABASE_URL = "https://upgvfyinupjboovvobdm.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVwZ3ZmeWludXBqYm9vdnZvYmRtIiwicm9sZSIsImV4cCI6MjA3MzUzNTY2MX0.v39LBa0GXNDcN1EhrnaKIDt6F9DKMff-onRpFUfxRjg";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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
function gerarHorarios(){
  const data = dataInput.value;
  const container = document.getElementById("horarios");
  container.innerHTML="";
  horarioSelecionado = null;
  if(!data) return;

  const ocupados = agendamentos.filter(a=>a.Data===data);

  function criarHorarioDiv(hora, periodo){
    const div = document.createElement("div");
    div.classList.add("hora", periodo);
    div.textContent = hora;

    const regOcupado = ocupados.find(r=>r.Hora===hora);
    if(regOcupado){
      div.classList.add("ocupado");
      div.dataset.tooltip = `${regOcupado.Falecido} (${regOcupado.Pendencias}) - ${regOcupado.Atendente}`;
      if(isAdmin){
        div.onclick = () => {
          if(confirm(`Excluir horário ${hora}?`)){
            agendamentos = agendamentos.filter(a=>!(a.Data===data && a.Hora===hora));
            localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
            gerarHorarios(); mostrarSepultamentosDia();
          }
        };
      }
    } else {
      const dtHorario = new Date(`${data}T${hora}:00-03:00`);
      let bloqueado = false;

      if(data === hojeStr && dtHorario < new Date()){ 
        div.classList.add("ocupado");
        div.dataset.tooltip = "Horário passado";
        bloqueado = true;
      }

      if(!bloqueado){
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
  resumoEl.innerHTML=`
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

// ===== COPIAR RESUMO =====
function copiarResumo(){
  const textoResumo = resumoEl.innerText || document.getElementById("modalInfo").innerText;
  navigator.clipboard.writeText(textoResumo).then(()=>{
    alert("Resumo copiado para a área de transferência!");
  }).catch(()=>{
    alert("Erro ao copiar!");
  });
}

// ===== ENVIAR PARA WHATSAPP =====
function enviarWhatsApp() {
  const textoResumo = resumoEl.innerText || document.getElementById("modalInfo").innerText;
  const mensagem = encodeURIComponent(textoResumo);

  // 🔹 Se for enviar para número específico:
  // const numero = "55SEUNUMEROAQUI";
  // const url = `https://api.whatsapp.com/send?phone=${numero}&text=${mensagem}`;

  // 🔹 Se for enviar para grupo/link de convite:
  const url = `https://api.whatsapp.com/send?text=${mensagem}`;

  window.open(url, "_blank");
}

// ===== CONFIRMAR AGENDAMENTO =====
function confirmarAgendamento(){
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

  if(agendamentos.some(a=>a.Falecido.toLowerCase() === falecido.toLowerCase())){
    alert("Este falecido já está agendado!");
    return;
  }

  agendamentos.push({
    Data:data,
    Hora:horarioSelecionado,
    Falecido:falecido,
    Contrato:contrato,
    Gavetas: gavetas,
    Titular:titular,
    Pendencias:pendencias,
    DescPendencia:descPendencia,
    Exumacao:exumacao,
    Setor:setor,
    Atendente:usuarioLogado
  });

  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  gerarHorarios(); mostrarSepultamentosDia(); atualizarResumo();
}

// ===== MOSTRAR SEPULTAMENTOS =====
function mostrarSepultamentosDia(){
  limparAgendamentosExpirados();
  const container = document.getElementById("diasCalendario");
  container.innerHTML="";
  for(let i=0;i<5;i++){
    const dia = new Date();
    dia.setDate(hoje.getDate()+i);
    const diaStr = dia.toISOString().split("T")[0];
    const cardDia = document.createElement("div");
    cardDia.classList.add("cardDia");

    const titulo = document.createElement("h4");
    titulo.textContent = "SEPULTAMENTO - " + dia.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"});
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
      div.onclick = ()=> abrirModal(a);

      if(isAdmin){
        const btn = document.createElement("button"); btn.textContent="Excluir"; btn.classList.add("excluir");
        btn.onclick = e=>{ e.stopPropagation(); if(confirm("Excluir agendamento?")){ 
          agendamentos=agendamentos.filter(x=>x!==a); 
          localStorage.setItem("agendamentos",JSON.stringify(agendamentos)); 
          mostrarSepultamentosDia(); gerarHorarios(); 
        }};
        div.appendChild(btn);
      } else if(a.Atendente===usuarioLogado){
        const btn = document.createElement("button"); btn.textContent="Editar"; btn.classList.add("editar");
        btn.onclick = e=>{ e.stopPropagation(); editarAgendamento(a); };
        div.appendChild(btn);
      }

      cardDia.appendChild(div);
    });

    container.appendChild(cardDia);
  }
}

// ===== MODAL =====
function abrirModal(ag){
  document.getElementById("modalInfo").innerHTML=`
    <p><b>Data:</b> ${ag.Data}</p>
    <p><b>Hora:</b> ${ag.Hora}</p>
    <p><b>Falecido:</b> ${ag.Falecido}</p>
    <p><b>Titular:</b> ${ag.Titular}</p>
    <p><b>Contrato:</b> ${ag.Contrato} (${ag.Gavetas} ${ag.Gavetas==1?"gaveta":"gavetas"})</p>
    <p><b>Pendências:</b> ${ag.Pendencias} - ${ag.DescPendencia}</p>
    <p><b>Exumação:</b> ${ag.Exumacao}</p>
    <p><b>Setor:</b> ${ag.Setor}</p>
    <p><b>Atendente:</b> ${ag.Atendente}</p>
    <button onclick="copiarResumo()">Copiar Resumo</button>
    <button onclick="enviarWhatsApp()">Enviar para WhatsApp</button>
  `;
  document.getElementById("modalResumo").style.display="flex";
}

function fecharModal(){
  document.getElementById("modalResumo").style.display="none";
}

// ===== EDITAR AGENDAMENTO =====
function editarAgendamento(ag){
  dataInput.value = ag.Data;
  horarioSelecionado = ag.Hora;
  document.getElementById("falecido").value=ag.Falecido;
  document.getElementById("contrato").value=ag.Contrato;
  document.getElementById("gavetas").value=ag.Gavetas;
  document.getElementById("titular").value=ag.Titular;
  document.getElementById("pendencias").value=ag.Pendencias;
  document.getElementById("descPendencia").value=ag.DescPendencia;
  document.getElementById("exumacao").value=ag.Exumacao;
  document.getElementById("setor").value=ag.Setor;
  gerarHorarios();
  atualizarResumo();
}

mostrarSepultamentosDia();
