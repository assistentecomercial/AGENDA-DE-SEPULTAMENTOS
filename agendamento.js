<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Agendamento - Sistema de Sepultamentos</title>
<style>
body { font-family: Garamond, serif; background:#f0f2f5; margin:0; padding:20px;}
.topo { display:flex; justify-content:flex-end; align-items:center; gap:10px; margin-bottom:10px }
.topo img { width:30px; height:30px; border-radius:50%; }
.topo span { font-weight:bold; }
.container { display:flex; gap:20px; flex-wrap:wrap; max-width:1200px; width:100%; }
.agenda, .lista { background:white; border-radius:12px; padding:20px; box-shadow:0 4px 12px rgba(0,0,0,0.15); flex:1 1 400px; }
h2 { color:#28a745; text-align:center; margin-bottom:15px; }
label { font-weight:bold; display:block; margin-top:10px; }
input, select, button { width:100%; padding:10px; margin:6px 0; border-radius:8px; border:1px solid #ccc; font-size:16px; }
button { background:#28a745; color:white; border:none; cursor:pointer; transition:0.2s; }
button:hover { background:#218838; transform:scale(1.02); }
#horarios { display:flex; flex-wrap:wrap; gap:10px; margin-top:10px; }
.hora { padding:12px; border-radius:12px; cursor:pointer; flex:1 0 80px; text-align:center; background:#e9ecef; transition:0.2s; position: relative; }
.hora:hover { transform:translateY(-2px) scale(1.05); background:#d4edda; }
.hora.selecionado { background:#28a745; color:white; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.2);}
.hora.ocupado { background:#dc3545; color:white; cursor:not-allowed; }
.hora[data-tooltip]:hover::after { content: attr(data-tooltip); position: absolute; bottom: 120%; left: 50%; transform: translateX(-50%); background:#333; color:#fff; padding:6px 10px; border-radius:6px; white-space: nowrap; font-size:12px; opacity:0.9; pointer-events:none; }
#resumo { display:block; margin-top:20px; padding:15px; border-radius:12px; background:#f8f9fa; border:1px solid #ccc; }
.lista-sepultamentos { margin-top:10px; max-height:500px; overflow-y:auto; }
.lista-sepultamentos .card { background:#e9ecef; padding:10px; border-radius:10px; margin-bottom:8px; transition:0.2s; cursor:pointer; position:relative; }
.lista-sepultamentos .card:hover { transform:translateY(-2px); box-shadow:0 4px 8px rgba(0,0,0,0.15); }
.lista-sepultamentos .card h4 { margin:0 0 5px 0; color:#28a745; }
.card button { margin-top:5px; font-size:12px; padding:4px 8px; border-radius:6px; border:none; cursor:pointer; }
.card .editar { background:#ffc107; color:#fff; }
.card .excluir { background:#dc3545; color:#fff; }
.modal { display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); justify-content:center; align-items:center; z-index:100; }
.modal-content { background:white; padding:20px; border-radius:12px; width:350px; max-width:90%; position:relative; }
.modal-content h3 { margin-top:0; color:#28a745; }
.close-modal { position:absolute; top:10px; right:10px; cursor:pointer; font-weight:bold; font-size:18px; }
.copy-btn { position:absolute; top:10px; left:10px; cursor:pointer; background:#28a745; color:white; border:none; padding:5px 8px; border-radius:6px; font-size:12px; }
.diasCalendario { display:flex; gap:10px; flex-wrap:wrap; margin-top:10px; }
.cardDia { background:#f8f9fa; border:1px solid #ccc; border-radius:12px; padding:10px; flex:1 1 180px; }
.cardDia h4 { text-align:center; color:#28a745; }
.cardAgendamento { background:#e9ecef; padding:6px; margin:4px 0; border-radius:8px; cursor:pointer; display:flex; justify-content:space-between; align-items:center; }
.cardAgendamento:hover { transform:scale(1.02); background:#d4edda; }
button.excluir { background:#dc3545; color:white; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; margin-left:5px; }
button.editar { background:#ffc107; color:black; border:none; padding:2px 6px; border-radius:4px; cursor:pointer; margin-left:5px; }
.row { display:flex; gap:10px; }
.row input { flex:1; }
@media(max-width:900px){ .container{flex-direction:column;} }
</style>
</head>
<body>

<div class="topo">
  <img src="https://cdn-icons-png.flaticon.com/512/3135/3135715.png" alt="Usuário">
  <span id="nomeUsuario"></span>
</div>

<div class="container">
  <div class="agenda">
    <h2>Agendamento de Sepultamentos</h2>

    <label for="data">Data:</label>
    <input type="date" id="data">

    <div id="horarios">Escolha uma data para ver os horários disponíveis</div>

    <div class="row">
      <div>
        <label for="contrato">Nº Contrato:</label>
        <input type="text" id="contrato">
      </div>
      <div>
        <label for="gavetas">Qtde. Gavetas:</label>
        <input type="number" id="gavetas" min="1" max="3">
      </div>
    </div>

    <label>Nome do Falecido:</label>
    <input type="text" id="falecido">

    <label>Titular:</label>
    <input type="text" id="titular">

    <label>Pendências:</label>
    <select id="pendencias">
      <option value="NENHUMA">Nenhuma</option>
      <option value="DOCUMENTAÇÃO">Documentação</option>
      <option value="PAGAMENTO">Pagamento</option>
    </select>

    <label>Descrição da Pendência:</label>
    <input type="text" id="descPendencia">

    <label>Exumação:</label>
    <select id="exumacao">
      <option value="NÃO">Não</option>
      <option value="SIM">Sim</option>
    </select>

    <label>Setor:</label>
    <input type="text" id="setor">

    <button onclick="confirmarAgendamento()">Confirmar</button>

    <div id="resumo"></div>
  </div>

  <div class="lista">
    <h2>Sepultamentos Próximos 5 Dias</h2>
    <div id="diasCalendario" class="diasCalendario"></div>
  </div>
</div>

<div class="modal" id="modalResumo">
  <div class="modal-content" id="modalContent">
    <button class="copy-btn" onclick="copiarResumo()">📋 Copiar</button>
    <span class="close-modal" onclick="fecharModal()">&times;</span>
    <div id="modalInfo"></div>
  </div>
</div>

<script>
/* ==== JS COMPLETO ATUALIZADO ==== */
const horariosManha = ["09:00","09:20","09:40","10:00","10:20","10:40","11:00"];
const horariosTarde = ["14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"];
const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";
document.getElementById("nomeUsuario").textContent = usuarioLogado;

let horarioSelecionado = null;
const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");
let agendamentos = JSON.parse(localStorage.getItem("agendamentos") || "[]");

const hoje = new Date();
const maxData = new Date();
maxData.setDate(hoje.getDate()+5);
dataInput.min = hoje.toISOString().split("T")[0];
dataInput.max = maxData.toISOString().split("T")[0];

function limparAgendamentosExpirados(){
  const agora = new Date();
  agendamentos = agendamentos.filter(a=>{
    const [h,m] = (a.Hora || a.fields?.Hora || "00:00").split(":").map(Number);
    const dt = new Date(a.Data);
    dt.setHours(h,m,0,0);
    dt.setDate(dt.getDate()+1);
    return dt > agora;
  });
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
}
limparAgendamentosExpirados();

dataInput.addEventListener("change", ()=>{
  gerarHorarios();
  mostrarSepultamentosDia();
});

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

    const regOcupado = ocupados.find(r=>(r.Hora||r.fields?.Hora)===hora);
    const agora = new Date();
    const dataSelecionada = new Date(data+"T"+hora);
    if(dataSelecionada < agora) div.classList.add("ocupado");

    if(regOcupado){
      div.classList.add("ocupado");
      div.dataset.tooltip = `${regOcupado.Falecido} (${regOcupado.Pendencias}) - ${regOcupado.Atendente}`;
      if(isAdmin){
        div.onclick = () => {
          if(confirm(`Excluir horário ${hora}?`)){
            agendamentos = agendamentos.filter(a=>!(a.Data===data && (a.Hora||a.fields?.Hora)===hora));
            localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
            gerarHorarios(); mostrarSepultamentosDia();
          }
        };
      }
    } else if(!div.classList.contains("ocupado")){
      div.onclick = () => selecionarHorario(div,hora);
    }

    return div;
  }

  const manha = document.createElement("div"); manha.style.marginBottom="10px";
  horariosManha.forEach(h=>manha.appendChild(criarHorarioDiv(h)));
  container.appendChild(manha);

  const tarde = document.createElement("div");
  horariosTarde.forEach(h=>tarde.appendChild(criarHorarioDiv(h)));
  container.appendChild(tarde);
}

function selecionarHorario(div,hora){
  document.querySelectorAll(".hora").forEach(h=>h.classList.remove("selecionado"));
  div.classList.add("selecionado");
  horarioSelecionado = hora;
  atualizarResumo();
}

function atualizarResumo(){
  const contrato = document.getElementById("contrato").value || "-";
  const gavetas = document.getElementById("gavetas").value || "-";
  resumoEl.innerHTML=`
    <h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value||"-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado||"-"}</p>
    <p><b>Falecido:</b> ${document.getElementById("falecido").value||"-"}</p>
    <p><b>Titular:</b> ${document.getElementById("titular").value||"-"}</p>
    <p><b>Nº do contrato:</b> ${contrato} - "${gavetas} ${gavetas==1?'gaveta':'gavetas'}"</p>
    <p><b>Atendente:</b> ${usuarioLogado||"-"}</p>`;
}

function confirmarAgendamento(){
  const data = dataInput.value;
  const falecido = document.getElementById("falecido").value.trim();
  const contrato = document.getElementById("contrato").value.trim();
  const gavetas = document.getElementById("gavetas").value;
  const titular = document.getElementById("titular").value.trim();
  const pendencias = document.getElementById("pendencias").value;
  const descPendencia = document.getElementById("descPendencia").value;
  const exumacao = document.getElementById("exumacao").value;
  const setor = document.getElementById("setor").value.trim();

  if(!data || !horarioSelecionado || !falecido){
    alert("Preencha todos os campos e selecione um horário!");
    return;
  }

  const agora = new Date();
  const horaSelecionada = new Date(data+"T"+horarioSelecionado);
  if(horaSelecionada < agora){
    alert("Não é possível agendar horário retroativo!");
    return;
  }

  if(agendamentos.some(a=>a.Falecido?.toLowerCase()===falecido.toLowerCase() && a.Data===data)){
    alert("Este falecido já possui agendamento nesta data!");
    return;
  }

  agendamentos.push({Data:data,Hora:horarioSelecionado,Falecido:falecido,Contrato:contrato,Gavetas:gavetas,Titular:titular,Pendencias:pendencias,DescPendencia:descPendencia,Exumacao:exumacao,Setor:setor,Atendente:usuarioLogado});

  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
  gerarHorarios(); mostrarSepultamentosDia(); atualizarResumo();
}

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
      div.textContent=`${a.Hora||"-"} - ${a.Falecido||"-"}`;
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

function abrirModal(a){
  const modal = document.getElementById("modalResumo");
  const info = document.getElementById("modalInfo");
  
  info.innerHTML = `
    <p><b>FALECIDO:</b> ${a.Falecido}</p>
    <p><b>TITULAR:</b> ${a.Titular||"-"}</p>
    <p><b>NÚMERO DO CONTRATO:</b> ${a.Contrato||"-"} - "${a.Gavetas||"-"} ${a.Gavetas==1?'gaveta':'gavetas'}"</p>
    <p><b>SETOR:</b> ${a.Setor||"-"}</p>
    <p><b>HORÁRIO:</b> ${a.Hora||"-"}</p>
    <p><b>PENDÊNCIAS:</b> ${a.Pendencias}</p>
    <p><b>DESCRIÇÃO:</b> ${a.DescPendencia||"-"}</p>
  `;

  modal.style.display="flex";
}

function fecharModal(){ document.getElementById("modalResumo").style.display="none"; }

function copiarResumo(){
  const texto = document.getElementById("modalInfo").innerText;
  navigator.clipboard.writeText(texto)
    .then(() => alert("Resumo copiado!"))
    .catch(err => alert("Erro ao copiar: "+err));
}

function editarAgendamento(a){
  dataInput.value = a.Data;
  gerarHorarios();
  setTimeout(()=>{
    const divHora = Array.from(document.querySelectorAll(".hora")).find(h=>h.textContent===a.Hora);
    if(divHora) selecionarHorario(divHora,a.Hora);
  },50);

  document.getElementById("falecido").value = a.Falecido;
  document.getElementById("contrato").value = a.Contrato;
  document.getElementById("gavetas").value = a.Gavetas;
  document.getElementById("titular").value = a.Titular;
  document.getElementById("pendencias").value = a.Pendencias;
  document.getElementById("descPendencia").value = a.DescPendencia;
  document.getElementById("exumacao").value = a.Exumacao;
  document.getElementById("setor").value = a.Setor;

  agendamentos = agendamentos.filter(x=>x!==a);
  localStorage.setItem("agendamentos", JSON.stringify(agendamentos));
}

document.getElementById("gavetas").addEventListener("input", e=>{
  let val = parseInt(e.target.value);
  if(val>3) e.target.value=3;
  if(val<1) e.target.value=1;
  atualizarResumo();
});
document.getElementById("contrato").addEventListener("input", atualizarResumo);
document.getElementById("falecido").addEventListener("input", atualizarResumo);
document.getElementById("titular").addEventListener("input", atualizarResumo);

mostrarSepultamentosDia();
</script>
</body>
</html>
