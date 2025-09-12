const API_KEY = "patOFccvkTYdyuFT5";
const BASE_ID = "app2lNLG6HAy5tHmx";
const TABLE_NAME = "Sepultamentos";

const usuarioLogado = localStorage.getItem("usuarioLogado") || "";
const isAdmin = localStorage.getItem("isAdmin") === "true";

if(isAdmin) document.getElementById("adminControles").style.display="block";

const horariosPadrao = [
  "09:00","09:20","09:40","10:00","10:20","10:40","11:00",
  "14:20","14:40","15:00","15:20","15:40","16:00","16:20","16:40"
];

let horarioSelecionado = null;
const dataInput = document.getElementById("data");
const resumoEl = document.getElementById("resumo");

// Limita datas (hoje até 5 dias)
const hoje = new Date();
const maxData = new Date();
maxData.setDate(hoje.getDate() + 5);
dataInput.min = hoje.toISOString().split("T")[0];
dataInput.max = maxData.toISOString().split("T")[0];

// Preenche hoje automaticamente
window.addEventListener("load", () => {
  dataInput.value = hoje.toISOString().split("T")[0];
  gerarHorarios();
  mostrarSepultamentosDia();
});

// Ao mudar data
dataInput.addEventListener("change", () => {
  gerarHorarios();
  mostrarSepultamentosDia();
});

// Gerar horários clicáveis
async function gerarHorarios(){
  const data = dataInput.value;
  const container = document.getElementById("horarios");
  container.innerHTML = "";
  horarioSelecionado = null;
  if(!data) return;

  const ocupados = await buscarHorariosOcupados(data);

  horariosPadrao.forEach(hora => {
    const div = document.createElement("div");
    div.classList.add("hora");
    div.textContent = hora;

    const registroOcupado = ocupados.find(r => r.Hora === hora);
    if(registroOcupado){
      div.classList.add("ocupado");
      div.dataset.tooltip = `${registroOcupado.Falecido} (${registroOcupado.Pendencias || "Sem pendência"})`;
      if(isAdmin){
        div.title = "Clique para desbloquear (Admin)";
        div.onclick = async () => {
          if(confirm(`Desbloquear horário ${hora}?`)){
            await deletarAgendamento(registroOcupado.id);
            gerarHorarios();
            mostrarSepultamentosDia();
          }
        };
      }
    } else {
      div.onclick = () => selecionarHorario(div,hora);
    }

    container.appendChild(div);
  });
}

function selecionarHorario(div,hora){
  document.querySelectorAll(".hora").forEach(h => h.classList.remove("selecionado"));
  div.classList.add("selecionado");
  horarioSelecionado = hora;
  atualizarResumo();
}

// Buscar horários ocupados Airtable
async function buscarHorariosOcupados(data){
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=DATETIME_FORMAT({Data}, 'YYYY-MM-DD')='${data}'`;
  const resposta = await fetch(url,{headers:{Authorization:`Bearer ${API_KEY}`}});
  const dados = await resposta.json();
  return dados.records.map(r=>({
    id: r.id,
    Hora: r.fields.Hora,
    Falecido: r.fields.Falecido,
    Pendencias: r.fields.Pendencias,
    Setor: r.fields.Setor
  }));
}

// Mostrar sepultamentos do dia
async function mostrarSepultamentosDia(){
  const data = dataInput.value;
  const listaEl = document.getElementById("listaDia");
  listaEl.innerHTML = "";
  if(!data) return;

  const url = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=DATETIME_FORMAT({Data}, 'YYYY-MM-DD')='${data}'`;
  const resposta = await fetch(url,{headers:{Authorization:`Bearer ${API_KEY}`}});
  const dados = await resposta.json();

  dados.records.forEach(r=>{
    const card = document.createElement("div");
    card.classList.add("card");
    card.innerHTML=`<h4>${r.fields.Hora}</h4>
                    <p>${r.fields.Falecido}</p>
                    <p>${r.fields.Setor || "Sem setor"}</p>`;
    listaEl.appendChild(card);
  });
}

// Confirmar agendamento
async function confirmarAgendamento(){
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

  const novoAgendamento = { fields: { 
    Data:data, 
    Hora:horarioSelecionado, 
    Falecido:falecido, 
    Pendencias:pendencias, 
    DescPendencia:descPendencia, 
    Exumacao:exumacao, 
    Setor:setor, 
    Atendente:usuarioLogado 
  }};

  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}`,{
    method:"POST",
    headers:{Authorization:`Bearer ${API_KEY}`, "Content-Type":"application/json"},
    body:JSON.stringify(novoAgendamento)
  });

  atualizarResumo();
  gerarHorarios();
  mostrarSepultamentosDia();
}

// Cancelar agendamento
async function deletarAgendamento(id){
  await fetch(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}/${id}`,{
    method:"DELETE", 
    headers:{Authorization:`Bearer ${API_KEY}`}
  });
}

// Atualizar resumo
function atualizarResumo(){
  const falecido = document.getElementById("falecido").value;
  resumoEl.innerHTML=`<h3>Resumo do Agendamento</h3>
    <p><b>Data:</b> ${dataInput.value || "-"}</p>
    <p><b>Hora:</b> ${horarioSelecionado || "-"}</p>
    <p><b>Falecido:</b> ${falecido || "-"}</p>
    <p><b>Atendente:</b> ${usuarioLogado || "-"}</p>`;
}
