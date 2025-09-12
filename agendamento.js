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
let agendamentos = JSON.parse(localStorage.getItem("agendamentos") || "[]");

// ===== CONFIGURAÇÕES DE DATA =====
const hoje = new Date();
const maxData = new Date();
maxData.setDate(hoje.getDate()+5);
dataInput.min = hoje.toISOString().split("T")[0];
dataInput.max = maxData.toISOString().split("T")[0];

// ===== LIMPAR AGENDAMENTOS EXPIRADOS =====
function limparAgendamentosExpirados(){
  const agora = new Date();
  agendamentos = agendamentos.filter(a=>{
    const [h,m] = a.Hora.split(":").map(Number);
    const dt = new Date(a.Data);
    dt.setHours(h,m,0,0);
    dt.setDate(dt.getDate()+1); // expira 1 dia depois
    return dt > agora;
  });
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
}
limparAgendamentosExpirados();

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

  function criarHorarioDiv(hora){
    const div = document.createElement("div");
    div.classList.add("hora");
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
      div.onclick = () => selecionarHorario(div,hora);
    }
    return div;
  }

  // Separa manhã e tarde
  const manha = document.createElement("div"); manha.style.marginBottom="10px";
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
  resumoEl.innerHTML=`<h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Falecido:</b> ${document.getElementById("falecido").value||"-"}</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>`;
}

// ===== CONFIRMAR AGENDAMENTO =====
function confirmarAgendamento(){
  const data = dataInput.value;
  const falecido = document.getElementById("falecido").value;
  const pendencias = document.getElementById("pendencias").value;
  const descPendencia = document.getElementById("descPendencia").value;
  const exumacao = document.getElementById("exumacao").value;
  const setor = document.getElementById("setor").value;

  if(!data || !horarioSelecionado || !falecido){
    alert("Preencha todos os campos e selecione um horário!");
    return;
  }

  agendamentos.push({
    Data:data,
    Hora:horarioSelecionado,
    Falecido:falecido,
    Pendencias:pendencias,
    DescPendencia:descPendencia,
    Exumacao:exumacao,
    Setor:setor,
    Atendente:usuarioLogado
  });

  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  gerarHorarios(); mostrarSepultamentosDia(); atualizarResumo();
}

// ===== MOSTRAR SEPULTAMENTOS DOS PRÓXIMOS 5 DIAS =====
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
    titulo.textContent = dia.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"});
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
function abrirModal(a){
  const modal = document.getElementById("modalResumo");
  const info = document.getElementById("modalInfo");
  info.innerHTML=`<h3>${a.Falecido}</h3>
                  <p><b>Data:</b> ${a.Data}</p>
                  <p><b>Hora:</b> ${a.Hora}</p>
                  <p><b>Pendências:</b> ${a.Pendencias}</p>
                  <p><b>Descrição:</b> ${a.DescPendencia||"-"}</p>
                  <p><b>Exumação:</b> ${a.Exumacao}</p>
                  <p><b>Setor:</b> ${a.Setor||"-"}</p>
                  <p><b>Atendente:</b> ${a.Atendente}</p>`;
  modal.style.display="flex";
}
function fecharModal(){ document.getElementById("modalResumo").style.display="none"; }

// ===== EDITAR =====
function editarAgendamento(a){
  dataInput.value = a.Data;
  gerarHorarios();
  setTimeout(()=>{
    const divHora = Array.from(document.querySelectorAll(".hora")).find(h=>h.textContent===a.Hora);
    if(divHora) selecionarHorario(divHora,a.Hora);
  },50);

  document.getElementById("falecido").value = a.Falecido;
  document.getElementById("pendencias").value = a.Pendencias;
  document.getElementById("descPendencia").value = a.DescPendencia;
  document.getElementById("exumacao").value = a.Exumacao;
  document.getElementById("setor").value = a.Setor;

  agendamentos = agendamentos.filter(x=>x!==a);
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
}

// ===== INICIALIZAÇÃO =====
mostrarSepultamentosDia();
