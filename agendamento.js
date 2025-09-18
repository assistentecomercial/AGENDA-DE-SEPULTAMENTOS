// Configuração do Supabase
const SUPABASE_URL = "https://upgvfyinupjboovvobdm.supabase.co";
const SUPABASE_KEY = "sb_publishable_YKLtx78hj_0DcAcZIsI9kg_CDdXQD01";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Horários pré-definidos (pode expandir depois)
const horariosDisponiveis = [
  "09:00", "09:20", "09:40", "10:00",
  "10:20", "10:40", "11:00", "11:20",
  "14:00", "14:20", "14:40", "15:00",
  "15:20", "15:40", "16:00", "16:20"
];

const agendaDiv = document.getElementById("agenda");
const mensagemDiv = document.getElementById("mensagem");

// Carregar horários do Supabase
async function carregarAgenda() {
  agendaDiv.innerHTML = "";
  mensagemDiv.textContent = "Carregando horários...";

  // Busca horários já agendados
  const { data: agendados, error } = await supabase
    .from("agendamentos")
    .select("hora, data");

  if (error) {
    mensagemDiv.textContent = "Erro ao carregar agenda!";
    console.error(error);
    return;
  }

  mensagemDiv.textContent = "";

  const hoje = new Date().toISOString().split("T")[0]; // yyyy-mm-dd

  horariosDisponiveis.forEach(hora => {
    const ocupado = agendados.some(a => a.hora === hora && a.data === hoje);

    const btn = document.createElement("div");
    btn.textContent = hora;
    btn.classList.add("hora");
    btn.classList.add(ocupado ? "ocupado" : "livre");

    if (!ocupado) {
      btn.addEventListener("click", () => reservarHorario(hora, hoje));
    }

    agendaDiv.appendChild(btn);
  });
}

// Reservar horário no Supabase
async function reservarHorario(hora, data) {
  const { error } = await supabase
    .from("agendamentos")
    .insert([{ hora, data }]);

  if (error) {
    mensagemDiv.textContent = "Erro ao reservar horário!";
    console.error(error);
    return;
  }

  mensagemDiv.textContent = `Horário ${hora} reservado com sucesso! 🎉`;
  carregarAgenda(); // recarregar agenda
}

// Inicializa
carregarAgenda();
