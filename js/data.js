/* Football Go - dados do jogo (times, chuteiras, bolas, bolsas, aulas, quiz) */
var FG = window.FG || {};
window.FG = FG;

FG.PITCH = { L: 105, W: 68, HL: 52.5, HW: 34, GOAL_W: 7.32, GOAL_HW: 3.66, GOAL_H: 2.44, BOX_D: 16.5, BOX_HW: 20.16, SIX_D: 5.5, SIX_HW: 9.16, SPOT: 11, CIRCLE: 9.15 };

// Seleções (cores genéricas, nomes de países). pattern: solid | stripes | hoops | halves | sash
FG.TEAMS = [
  { id: 'bra', name: 'Brasil', short: 'BRA', primary: '#f7d417', secondary: '#0a8a3c', shorts: '#1d4fb8', socks: '#ffffff', pattern: 'solid', num: '#0a8a3c', rating: 88, gk: '#2b2b2b' },
  { id: 'arg', name: 'Argentina', short: 'ARG', primary: '#7cc6f2', secondary: '#ffffff', shorts: '#16213e', socks: '#ffffff', pattern: 'stripes', num: '#16213e', rating: 89, gk: '#3a8f3a' },
  { id: 'fra', name: 'França', short: 'FRA', primary: '#1c2f6b', secondary: '#ffffff', shorts: '#ffffff', socks: '#c81e2c', pattern: 'solid', num: '#ffffff', rating: 88, gk: '#e5b81e' },
  { id: 'ale', name: 'Alemanha', short: 'ALE', primary: '#f4f4f4', secondary: '#111111', shorts: '#111111', socks: '#f4f4f4', pattern: 'solid', num: '#111111', rating: 85, gk: '#5c2a86' },
  { id: 'esp', name: 'Espanha', short: 'ESP', primary: '#c4141d', secondary: '#f2c500', shorts: '#1b2a5c', socks: '#1b2a5c', pattern: 'solid', num: '#f2c500', rating: 86, gk: '#2d9b5a' },
  { id: 'ing', name: 'Inglaterra', short: 'ING', primary: '#ffffff', secondary: '#c8102e', shorts: '#13204a', socks: '#ffffff', pattern: 'solid', num: '#13204a', rating: 86, gk: '#e8e04a' },
  { id: 'por', name: 'Portugal', short: 'POR', primary: '#9c1022', secondary: '#0d6b33', shorts: '#0d6b33', socks: '#9c1022', pattern: 'solid', num: '#f2c500', rating: 85, gk: '#1f1f1f' },
  { id: 'ita', name: 'Itália', short: 'ITA', primary: '#1f5fbf', secondary: '#ffffff', shorts: '#ffffff', socks: '#1f5fbf', pattern: 'solid', num: '#ffffff', rating: 84, gk: '#f0a020' },
  { id: 'hol', name: 'Holanda', short: 'HOL', primary: '#f36c21', secondary: '#111111', shorts: '#f36c21', socks: '#f36c21', pattern: 'solid', num: '#111111', rating: 84, gk: '#3c3c96' },
  { id: 'uru', name: 'Uruguai', short: 'URU', primary: '#5aa9e6', secondary: '#111111', shorts: '#111111', socks: '#111111', pattern: 'solid', num: '#111111', rating: 81, gk: '#d9d9d9' },
  { id: 'cro', name: 'Croácia', short: 'CRO', primary: '#e8202a', secondary: '#ffffff', shorts: '#ffffff', socks: '#1d3f8f', pattern: 'checks', num: '#1d3f8f', rating: 82, gk: '#3a3a3a' },
  { id: 'bel', name: 'Bélgica', short: 'BEL', primary: '#c8102e', secondary: '#111111', shorts: '#c8102e', socks: '#c8102e', pattern: 'solid', num: '#f2c500', rating: 82, gk: '#2a8a2a' },
  { id: 'mar', name: 'Marrocos', short: 'MAR', primary: '#c1272d', secondary: '#006233', shorts: '#006233', socks: '#c1272d', pattern: 'solid', num: '#ffffff', rating: 80, gk: '#e3c11d' },
  { id: 'jap', name: 'Japão', short: 'JAP', primary: '#1a2c78', secondary: '#ffffff', shorts: '#ffffff', socks: '#1a2c78', pattern: 'solid', num: '#ffffff', rating: 78, gk: '#ffb000' },
  { id: 'mex', name: 'México', short: 'MEX', primary: '#0b6b3a', secondary: '#c8102e', shorts: '#ffffff', socks: '#c8102e', pattern: 'solid', num: '#ffffff', rating: 77, gk: '#ff6e1e' },
  { id: 'eua', name: 'Estados Unidos', short: 'EUA', primary: '#ffffff', secondary: '#1b2a5c', shorts: '#1b2a5c', socks: '#ffffff', pattern: 'hoops', num: '#c8102e', rating: 76, gk: '#2b9b6b' },
  { id: 'col', name: 'Colômbia', short: 'COL', primary: '#fcd116', secondary: '#003893', shorts: '#003893', socks: '#ce1126', pattern: 'solid', num: '#003893', rating: 78, gk: '#444444' },
  { id: 'sen', name: 'Senegal', short: 'SEN', primary: '#ffffff', secondary: '#00853f', shorts: '#ffffff', socks: '#00853f', pattern: 'sash', num: '#00853f', rating: 77, gk: '#e8d44a' }
];
FG.teamById = function (id) {
  for (var i = 0; i < FG.TEAMS.length; i++) if (FG.TEAMS[i].id === id) return FG.TEAMS[i];
  return FG.TEAMS[0];
};

FG.RARITY = {
  common: { name: 'Comum', color: '#b9c3bd' },
  rare: { name: 'Rara', color: '#3fa1ff' },
  epic: { name: 'Épica', color: '#b55cff' },
  legendary: { name: 'Lendária', color: '#ffb31a' }
};

// Chuteiras: potência (força do chute), controle (domínio), velocidade (corrida), efeito (curva)
FG.BOOTS = [
  { id: 'boot_basic', name: 'Society Básica', rarity: 'common', color: '#202020', accent: '#ffffff', power: 60, control: 60, speed: 60, curve: 55 },
  { id: 'boot_terra', name: 'Terrão 2.0', rarity: 'common', color: '#7a4a24', accent: '#f2d27a', power: 66, control: 55, speed: 58, curve: 52 },
  { id: 'boot_branca', name: 'Classic Branca', rarity: 'common', color: '#f2f2f2', accent: '#1a1a1a', power: 58, control: 66, speed: 60, curve: 60 },
  { id: 'boot_azul', name: 'Raio Azul', rarity: 'common', color: '#1f6fe0', accent: '#ffffff', power: 60, control: 58, speed: 68, curve: 56 },
  { id: 'boot_canhao', name: 'Canhão Vermelha', rarity: 'rare', color: '#d0161e', accent: '#111111', power: 80, control: 62, speed: 64, curve: 60 },
  { id: 'boot_seda', name: 'Toque de Seda', rarity: 'rare', color: '#14b8a6', accent: '#fff3c4', power: 64, control: 82, speed: 64, curve: 70 },
  { id: 'boot_jato', name: 'Jato Neon', rarity: 'rare', color: '#c6f432', accent: '#0d0d0d', power: 62, control: 64, speed: 82, curve: 60 },
  { id: 'boot_curva', name: 'Folha Seca', rarity: 'epic', color: '#7c3aed', accent: '#ffd23f', power: 76, control: 78, speed: 70, curve: 92 },
  { id: 'boot_trovao', name: 'Trovão', rarity: 'epic', color: '#0f172a', accent: '#38bdf8', power: 90, control: 70, speed: 74, curve: 72 },
  { id: 'boot_ouro', name: 'Bota de Ouro', rarity: 'legendary', color: '#e7b416', accent: '#ffffff', power: 94, control: 90, speed: 86, curve: 88 },
  { id: 'boot_fenix', name: 'Fênix', rarity: 'legendary', color: '#ff5a1f', accent: '#ffe066', power: 90, control: 86, speed: 95, curve: 90 }
];
// Bolas: peso (mais pesada = menos voo), quique, efeito (curva no ar), visibilidade
FG.BALLS = [
  { id: 'ball_classic', name: 'Clássica 32 Gomos', rarity: 'common', base: '#ffffff', patch: '#111111', style: 'classic', weight: 60, bounce: 60, curve: 55, visibility: 60 },
  { id: 'ball_rua', name: 'Bola de Rua', rarity: 'common', base: '#f2e6c8', patch: '#7a3b12', style: 'classic', weight: 70, bounce: 50, curve: 45, visibility: 50 },
  { id: 'ball_treino', name: 'Treino Laranja', rarity: 'common', base: '#ff8a1c', patch: '#ffffff', style: 'swirl', weight: 62, bounce: 62, curve: 55, visibility: 85 },
  { id: 'ball_noite', name: 'Noturna Amarela', rarity: 'rare', base: '#ffe14a', patch: '#1b2a5c', style: 'swirl', weight: 58, bounce: 64, curve: 64, visibility: 95 },
  { id: 'ball_veloz', name: 'Veloz Pro', rarity: 'rare', base: '#ffffff', patch: '#e11d48', style: 'swirl', weight: 50, bounce: 66, curve: 72, visibility: 70 },
  { id: 'ball_tango', name: 'Estrela 78', rarity: 'epic', base: '#ffffff', patch: '#111111', style: 'triad', weight: 56, bounce: 70, curve: 80, visibility: 72 },
  { id: 'ball_final', name: 'Bola da Final', rarity: 'epic', base: '#f8f8f8', patch: '#c9a227', style: 'triad', weight: 55, bounce: 72, curve: 86, visibility: 75 },
  { id: 'ball_galaxia', name: 'Galáxia', rarity: 'legendary', base: '#1e1b4b', patch: '#a78bfa', style: 'swirl', weight: 52, bounce: 76, curve: 95, visibility: 80 },
  { id: 'ball_ouro', name: 'Bola de Ouro', rarity: 'legendary', base: '#f5c518', patch: '#ffffff', style: 'triad', weight: 54, bounce: 74, curve: 92, visibility: 92 }
];
FG.itemById = function (id) {
  var l = FG.BOOTS.concat(FG.BALLS);
  for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i];
  return null;
};

FG.BAGS = [
  { id: 'bronze', name: 'Bolsa Bronze', price: 150, color: '#b0703a', odds: { common: 72, rare: 23, epic: 5, legendary: 0 }, coins: [20, 80] },
  { id: 'prata', name: 'Bolsa Prata', price: 400, color: '#c9d1d9', odds: { common: 35, rare: 45, epic: 17, legendary: 3 }, coins: [60, 180] },
  { id: 'ouro', name: 'Bolsa Ouro', price: 1000, color: '#f2c230', odds: { common: 0, rare: 42, epic: 43, legendary: 15 }, coins: [150, 400] }
];

FG.DIFFICULTY = [
  { id: 0, name: 'Fácil', ai: 0.55 },
  { id: 1, name: 'Normal', ai: 0.75 },
  { id: 2, name: 'Difícil', ai: 0.92 },
  { id: 3, name: 'Lenda', ai: 1.05 }
];

FG.FIRST_NAMES = ['Lucas', 'Mateus', 'Rafael', 'Thiago', 'Bruno', 'Diego', 'Pedro', 'Gabriel', 'Felipe', 'André', 'Hugo', 'Leo', 'Marco', 'Nico', 'Samuel', 'Ivan', 'Joel', 'Kai', 'Omar', 'Yuri', 'Enzo', 'Caio', 'Davi', 'Igor', 'Tomás', 'Luan', 'Ruan', 'Vitor'];
FG.LAST_NAMES = ['Silva', 'Souza', 'Costa', 'Ramos', 'Lima', 'Moreira', 'Duarte', 'Ferraz', 'Neves', 'Prado', 'Torres', 'Vidal', 'Mendes', 'Rocha', 'Barros', 'Campos', 'Nunes', 'Faria', 'Lopes', 'Teles', 'Castro', 'Reis', 'Pires', 'Guerra'];

FG.CLUB_PREFIX = ['Esporte Clube', 'Atlético', 'Real', 'União', 'Sport', 'Clube Atlético', 'Associação', 'Racing', 'Unidos de', 'Grêmio'];
FG.CLUB_CITY = ['Vila Nova', 'Porto Verde', 'Serra Azul', 'Rio Claro', 'Ouro Fino', 'Bela Vista', 'Monte Alto', 'Lagoa Seca', 'Campo Belo', 'Pedra Branca', 'São Jorge', 'Boa Esperança'];
FG.CLUB_COLORS = ['#c8102e', '#1d4fb8', '#0a8a3c', '#f7d417', '#111111', '#ffffff', '#f36c21', '#6b21a8', '#7cc6f2', '#8b1e3f', '#14b8a6', '#9ca3af'];
FG.CLUB_PATTERNS = ['solid', 'stripes', 'hoops', 'halves', 'sash', 'checks'];
FG.PATTERN_NAMES = { solid: 'Lisa', stripes: 'Listras', hoops: 'Faixas', halves: 'Metades', sash: 'Faixa diagonal', checks: 'Xadrez' };

/* ---------- Escola de Futebol: aulas ---------- */
// type: 'practice' -> tarefa jogável; 'rules' -> páginas com texto + diagrama
FG.LESSONS = [
  { id: 'l_move', type: 'practice', title: '1. Andar em campo', reward: 40, task: 'move',
    intro: ['Bem-vindo à Escola de Futebol!', 'Toque no TOUCHPAD para andar na direção em que você está olhando. Segure o GATILHO para correr.', 'No navegador: WASD para andar, Shift para correr, Q/E para girar.', 'Tarefa: chegue até os 3 cones iluminados.'] },
  { id: 'l_touch', type: 'practice', title: '2. Seu pé é o controle', reward: 40, task: 'touch',
    intro: ['O controle comanda o seu PÉ.', 'Aponte para baixo: o pé fica perto de você. Aponte para frente: o pé vai lá na frente. Aponte para cima: o pé sobe.', 'Mexa devagar para dominar e conduzir a bola; mexa rápido para chutar.', 'Tarefa: toque na bola 6 vezes.'] },
  { id: 'l_pass', type: 'practice', title: '3. Passe', reward: 50, task: 'pass',
    intro: ['O passe é o fundamento mais importante do futebol.', 'Para um passe rasteiro, bata no MEIO da bola com um movimento curto e firme.', 'Mire com o corpo: olhe para o alvo e mova o pé na direção dele.', 'Tarefa: passe a bola por entre os cones (mini gol) 3 vezes.'] },
  { id: 'l_shoot', type: 'practice', title: '4. Chute a gol', reward: 60, task: 'shoot',
    intro: ['Para chutar forte: dê um tapa rápido com o pulso, de baixo para cima.', 'Bater por BAIXO da bola faz ela subir; bater no meio deixa o chute rasteiro.', 'Mova o pé de lado no contato para dar EFEITO (curva).', 'Tarefa: faça 3 gols de fora da área.'] },
  { id: 'l_keeper', type: 'practice', title: '5. Goleiro', reward: 60, task: 'keeper',
    intro: ['Agora você é o goleiro!', 'Aponte o controle para onde quer colocar as LUVAS. Toque no touchpad para andar na linha.', 'Fique atento ao corpo do batedor: ele denuncia o canto.', 'Tarefa: defenda 3 chutes.'] },
  { id: 'r_field', type: 'rules', title: '6. Regra: O campo e a bola', reward: 30, pages: [
    { t: 'O campo de jogo', d: 'field', p: ['Um campo oficial tem entre 100 e 110 m de comprimento e 64 a 75 m de largura (padrão FIFA: 105 x 68 m).', 'As linhas laterais e de fundo fazem parte do campo: a bola só sai quando passa INTEIRA por elas.', 'O círculo central tem 9,15 m de raio.'] },
    { t: 'A grande área e o gol', d: 'box', p: ['A grande área (16,5 m) é onde o goleiro pode usar as mãos.', 'A pequena área (5,5 m) é onde se cobra o tiro de meta.', 'O gol mede 7,32 m de largura e 2,44 m de altura. A marca do pênalti fica a 11 m.'] },
    { t: 'A bola', d: 'ball', p: ['A bola oficial (tamanho 5) tem de 68 a 70 cm de circunferência e pesa entre 410 e 450 g.', 'Cada time tem 11 jogadores, sendo 1 goleiro. Uma partida não pode começar com menos de 7 por time.'] }
  ] },
  { id: 'r_time', type: 'rules', title: '7. Regra: Tempo e gol', reward: 30, pages: [
    { t: 'Duração da partida', d: 'clock', p: ['Uma partida tem 2 tempos de 45 minutos, com intervalo de 15 minutos.', 'O árbitro pode dar acréscimos pelo tempo perdido (substituições, lesões, comemorações).', 'Em mata-mata, se empatar, pode haver prorrogação (2 x 15 min) e depois disputa de pênaltis.'] },
    { t: 'Quando é gol?', d: 'goal', p: ['É gol quando a bola ultrapassa INTEIRAMENTE a linha do gol, entre as traves e por baixo do travessão.', 'Se uma parte da bola ainda está sobre a linha, NÃO é gol.', 'Vence quem marcar mais gols. Após um gol, o time que sofreu dá a saída no círculo central.'] }
  ] },
  { id: 'r_restart', type: 'rules', title: '8. Regra: Reinícios de jogo', reward: 30, pages: [
    { t: 'Lateral (arremesso)', d: 'throw', p: ['Quando a bola sai pela linha lateral, o time adversário de quem tocou por último cobra o lateral.', 'O arremesso é feito com as DUAS mãos, por trás e por cima da cabeça, com os dois pés no chão.', 'Não existe impedimento em cobrança de lateral.'] },
    { t: 'Escanteio e tiro de meta', d: 'corner', p: ['Se a bola sai pela linha de fundo e o ÚLTIMO toque foi do time que defende: escanteio para o ataque.', 'Se o último toque foi do time que ataca: tiro de meta para quem defende.', 'Em escanteio e tiro de meta também não há impedimento.'] },
    { t: 'Saída de bola', d: 'kickoff', p: ['O jogo começa e recomeça (após gols e no 2º tempo) com a saída no centro do campo.', 'Na saída, cada time deve estar em seu próprio campo, e os adversários a 9,15 m da bola.', 'Pode-se marcar gol direto da saída de bola!'] }
  ] },
  { id: 'r_fouls', type: 'rules', title: '9. Regra: Faltas e cartões', reward: 40, pages: [
    { t: 'O que é falta?', d: 'foul', p: ['É falta chutar, empurrar, segurar, dar rasteira, trombar de forma imprudente ou tocar a bola com a mão/braço de propósito.', 'A falta gera um TIRO LIVRE DIRETO (pode chutar direto ao gol) para o time que sofreu.', 'Na cobrança, a barreira deve ficar a 9,15 m da bola.'] },
    { t: 'Pênalti', d: 'penalty', p: ['Se a falta que gera tiro livre direto acontece DENTRO da grande área do time que defende, é pênalti.', 'O pênalti é cobrado da marca de 11 m. O goleiro deve ficar com pelo menos um pé sobre a linha até o chute.', 'Todos os outros jogadores ficam fora da área e a 9,15 m da bola.'] },
    { t: 'Cartões', d: 'cards', p: ['Cartão AMARELO: advertência (jogo imprudente, reclamação, retardar o jogo, antijogo).', 'Cartão VERMELHO: expulsão (jogo violento, impedir gol claro com falta ou mão, ou dois amarelos).', 'O jogador expulso não pode ser substituído — o time fica com um a menos.'] }
  ] },
  { id: 'r_offside', type: 'rules', title: '10. Regra: Impedimento', reward: 50, pages: [
    { t: 'Posição de impedimento', d: 'offside', p: ['Um atacante está em posição de impedimento se, no MOMENTO DO PASSE de um companheiro, ele está:', '• no campo do adversário, • mais perto da linha de fundo do que a bola, e • à frente do PENÚLTIMO defensor (normalmente o último zagueiro, já que o goleiro é o último).'] },
    { t: 'Quando é marcado?', d: 'offside2', p: ['Estar em posição de impedimento não é infração. Só é marcado se o jogador PARTICIPA do lance (recebe a bola, atrapalha um adversário etc.).', 'Não há impedimento em lateral, escanteio e tiro de meta, nem no seu próprio campo.', 'Punição: tiro livre indireto para o adversário. No Football Go, ligue o "Assistente de impedimento" nas opções para ver a linha!'] }
  ] },
  { id: 'r_tactics', type: 'rules', title: '11. Como jogar bem', reward: 40, pages: [
    { t: 'Posições', d: 'positions', p: ['GOLEIRO: defende o gol. ZAGUEIROS e LATERAIS: defendem. MEIO-CAMPISTAS: ligam defesa e ataque. ATACANTES: fazem gols.', 'Formações comuns: 4-4-2, 4-3-3, 3-5-2. Os números contam defensores, meias e atacantes.'] },
    { t: 'Dicas de ouro', d: 'tips', p: ['Levante a cabeça antes de receber a bola: saiba onde estão seus companheiros.', 'Passe e se movimente ("tabela"): quem passa deve buscar um novo espaço.', 'Na defesa, fique entre o atacante e o seu gol. Não dê o bote à toa!', 'Respeite o adversário e o árbitro: o Fair Play faz parte do jogo.'] }
  ] },
  { id: 'q_quiz', type: 'quiz', title: '12. Prova final (Quiz)', reward: 100 }
];

FG.QUIZ = [
  { q: 'Quantos jogadores cada time tem em campo numa partida oficial?', o: ['9', '10', '11', '12'], a: 2 },
  { q: 'Quanto mede a largura do gol?', o: ['5,00 m', '7,32 m', '8,50 m', '9,15 m'], a: 1 },
  { q: 'A bola saiu pela linha de fundo e o último toque foi do zagueiro que defende. O que é marcado?', o: ['Tiro de meta', 'Lateral', 'Escanteio', 'Pênalti'], a: 2 },
  { q: 'Quando é gol?', o: ['Quando a bola toca a linha', 'Quando metade da bola passa', 'Quando a bola passa inteira da linha', 'Quando o goleiro toca na bola'], a: 2 },
  { q: 'Falta para tiro livre direto dentro da grande área de quem defende é...', o: ['Escanteio', 'Pênalti', 'Lateral', 'Tiro indireto fora da área'], a: 1 },
  { q: 'Existe impedimento em cobrança de lateral?', o: ['Sim, sempre', 'Não', 'Só no 2º tempo', 'Só dentro da área'], a: 1 },
  { q: 'Qual a distância da barreira numa cobrança de falta?', o: ['5 m', '7,32 m', '9,15 m', '11 m'], a: 2 },
  { q: 'Dois cartões amarelos para o mesmo jogador significam...', o: ['Nada', 'Pênalti', 'Cartão vermelho (expulsão)', 'Escanteio'], a: 2 },
  { q: 'Quanto dura cada tempo de uma partida profissional?', o: ['30 min', '40 min', '45 min', '60 min'], a: 2 },
  { q: 'Um atacante está à frente do penúltimo defensor no momento do passe, no campo adversário, e recebe a bola. É...', o: ['Gol válido', 'Impedimento', 'Escanteio', 'Lateral'], a: 1 }
];
