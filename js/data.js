/* ==========================================================================
   OpSinergia REWORK - Clean Dataset (130 Real Operators, Buffer Subzones, Ilhas Pairs & Ops Responsável)
   ========================================================================== */

const STORAGE_KEY_OPERATORS = 'op_rework_operators_v9';
const STORAGE_KEY_OPS_SUPERVISORS = 'op_rework_ops_supervisors_v4';
const STORAGE_KEY_FIXED_PAIRS = 'op_rework_fixed_pairs_v3';
const STORAGE_KEY_FIXED_GROUPS = 'op_rework_fixed_groups_v5';

// Preset Zones Definition for REWORK
const REWORK_ZONES = {
  buffer_guardioes: { id: 'buffer_guardioes', name: 'GUARDIÕES DO BUFFER', parent: 'buffer', target: 2, desc: 'Gestão e controle do estoque intermediário' },
  buffer_saida: { id: 'buffer_saida', name: 'BUFFER DE SAÍDA', parent: 'buffer', target: 6, desc: 'Preparação e liberação de paletes' },
  ilhas: { id: 'ilhas', name: 'ILHAS', target: 32, desc: '16 Bancadas em Duplas da mesma Turma' },
  oportunidades: { id: 'oportunidades', name: 'ILHAS DA PROSPERIDADE', target: 5, desc: 'Tratamento de itens especiais & Salvados' },
  atrelamento: { id: 'atrelamento', name: 'ATRELAMENTO', target: 4, desc: 'Vinculação de etiquetas e SKUs' },
  fechamento_aut: { id: 'fechamento_aut', name: 'FECHAMENTO AUT', target: 2, desc: 'Empacotamento & Paletização Aut.' },
  fechamento_cpt: { id: 'fechamento_cpt', name: 'FECHAMENTO CPT', target: 4, desc: 'Corte de horário & Expedição crítica' },
  ops: { id: 'ops', name: 'MESAS OPS / LIDERANÇA', target: 2, desc: 'Supervisão operacional' },
  dock: { id: 'dock', name: 'POOL DE APOIO / SEM POSTO', target: 0, desc: 'Operadores aguardando definição de posto' },
  external_synergy: { id: 'external_synergy', name: 'SINERGIA EXTERNA', target: 0, desc: 'Operadores alocados fora do Rework' },
  inactive: { id: 'inactive', name: 'FOLGA / FALTA / ATESTADO', target: 0, desc: 'Indisponíveis na operação hoje' }
};

// Master list of all physical workstation positions on the shop floor
const POSITIONS_MASTER = [
  // GUARDIÕES DO BUFFER (B01 - B02)
  { code: 'B01', area: 'buffer_guardioes', areaName: 'Buffer', defaultRole: 'Guardião do Buffer', label: 'B01 — Guardião Buffer' },
  { code: 'B02', area: 'buffer_guardioes', areaName: 'Buffer', defaultRole: 'Guardião do Buffer', label: 'B02 — Guardião Buffer' },

  // BUFFER DE SAÍDA (B03 - B06)
  { code: 'B03', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Buffer de Saída', label: 'B03 — Buffer Saída' },
  { code: 'B04', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Buffer de Saída', label: 'B04 — Buffer Saída' },
  { code: 'B05', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Buffer de Saída', label: 'B05 — Buffer Saída' },
  { code: 'B06', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Buffer de Saída', label: 'B06 — Buffer Saída' },

  // ATRELAMENTO BUFFER (B07 - B08)
  { code: 'B07', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Atrelamento Buffer', label: 'B07 — Atrel. Buffer' },
  { code: 'B08', area: 'buffer_saida', areaName: 'Buffer', defaultRole: 'Atrelamento Buffer', label: 'B08 — Atrel. Buffer' },

  // OPORTUNIDADES / ILHAS DA PROSPERIDADE (P01 - P05)
  { code: 'P01', area: 'oportunidades', areaName: 'Prosperidade', defaultRole: 'REP 1', label: 'P01 — REP 1 Prosp.' },
  { code: 'P02', area: 'oportunidades', areaName: 'Prosperidade', defaultRole: 'REP 1', label: 'P02 — REP 1 Prosp.' },
  { code: 'P03', area: 'oportunidades', areaName: 'Prosperidade', defaultRole: 'REP 1', label: 'P03 — REP 1 Prosp.' },
  { code: 'P04', area: 'oportunidades', areaName: 'Prosperidade', defaultRole: 'REP 1', label: 'P04 — REP 1 Prosp.' },
  { code: 'P05', area: 'oportunidades', areaName: 'Prosperidade', defaultRole: 'REP 1', label: 'P05 — REP 1 Prosp.' },

  // ILHAS (I01 - I32)
  { code: 'I01', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 1, defaultRole: 'REP 1', label: 'I01 — Bancada 1 (Cima)' },
  { code: 'I02', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 1, defaultRole: 'REP 1', label: 'I02 — Bancada 1 (Baixo)' },
  { code: 'I03', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 2, defaultRole: 'REP 1', label: 'I03 — Bancada 2 (Cima)' },
  { code: 'I04', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 2, defaultRole: 'REP 1', label: 'I04 — Bancada 2 (Baixo)' },
  { code: 'I05', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 3, defaultRole: 'REP 1', label: 'I05 — Bancada 3 (Cima)' },
  { code: 'I06', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 3, defaultRole: 'REP 1', label: 'I06 — Bancada 3 (Baixo)' },
  { code: 'I07', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 4, defaultRole: 'REP 1', label: 'I07 — Bancada 4 (Cima)' },
  { code: 'I08', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 4, defaultRole: 'REP 1', label: 'I08 — Bancada 4 (Baixo)' },
  { code: 'I09', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 5, defaultRole: 'REP 1', label: 'I09 — Bancada 5 (Cima)' },
  { code: 'I10', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 5, defaultRole: 'REP 1', label: 'I10 — Bancada 5 (Baixo)' },
  { code: 'I11', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 6, defaultRole: 'REP 1', label: 'I11 — Bancada 6 (Cima)' },
  { code: 'I12', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 6, defaultRole: 'REP 1', label: 'I12 — Bancada 6 (Baixo)' },
  { code: 'I13', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 7, defaultRole: 'REP 1', label: 'I13 — Bancada 7 (Cima)' },
  { code: 'I14', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 7, defaultRole: 'REP 1', label: 'I14 — Bancada 7 (Baixo)' },
  { code: 'I15', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 8, defaultRole: 'REP 1', label: 'I15 — Bancada 8 (Cima)' },
  { code: 'I16', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 8, defaultRole: 'REP 1', label: 'I16 — Bancada 8 (Baixo)' },
  { code: 'I17', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 9, defaultRole: 'REP 1', label: 'I17 — Bancada 9 (Cima)' },
  { code: 'I18', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 9, defaultRole: 'REP 1', label: 'I18 — Bancada 9 (Baixo)' },
  { code: 'I19', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 10, defaultRole: 'REP 1', label: 'I19 — Bancada 10 (Cima)' },
  { code: 'I20', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 10, defaultRole: 'REP 1', label: 'I20 — Bancada 10 (Baixo)' },
  { code: 'I21', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 11, defaultRole: 'REP 1', label: 'I21 — Bancada 11 (Cima)' },
  { code: 'I22', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 11, defaultRole: 'REP 1', label: 'I22 — Bancada 11 (Baixo)' },
  { code: 'I23', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 12, defaultRole: 'REP 1', label: 'I23 — Bancada 12 (Cima)' },
  { code: 'I24', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 12, defaultRole: 'REP 1', label: 'I24 — Bancada 12 (Baixo)' },
  { code: 'I25', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 13, defaultRole: 'REP 1', label: 'I25 — Bancada 13 (Cima)' },
  { code: 'I26', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 13, defaultRole: 'REP 1', label: 'I26 — Bancada 13 (Baixo)' },
  { code: 'I27', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 14, defaultRole: 'REP 1', label: 'I27 — Bancada 14 (Cima)' },
  { code: 'I28', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 14, defaultRole: 'REP 1', label: 'I28 — Bancada 14 (Baixo)' },
  { code: 'I29', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 15, defaultRole: 'REP 1', label: 'I29 — Bancada 15 (Cima)' },
  { code: 'I30', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 15, defaultRole: 'REP 1', label: 'I30 — Bancada 15 (Baixo)' },
  { code: 'I31', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 16, defaultRole: 'REP 1', label: 'I31 — Bancada 16 (Cima)' },
  { code: 'I32', area: 'ilhas', areaName: 'Ilhas', bancadaIndex: 16, defaultRole: 'REP 1', label: 'I32 — Bancada 16 (Baixo)' },

  // FECHAMENTO AUT (F01 - F02)
  { code: 'F01', area: 'fechamento_aut', areaName: 'Fechamento AUT', defaultRole: 'REP 1', label: 'F01 — REP 1 Aut' },
  { code: 'F02', area: 'fechamento_aut', areaName: 'Fechamento AUT', defaultRole: 'REP 1', label: 'F02 — REP 1 Aut' },

  // ATRELAMENTO (A01 - A06: Ruas de CPTs)
  { code: 'A01', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A01 — REP 1 Atrel. (Rua 1)' },
  { code: 'A02', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A02 — REP 1 Atrel. (Rua 1)' },
  { code: 'A03', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A03 — REP 1 Atrel. (Rua 2)' },
  { code: 'A04', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A04 — REP 1 Atrel. (Rua 2)' },
  { code: 'A05', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A05 — REP 1 Atrel.' },
  { code: 'A06', area: 'atrelamento', areaName: 'Atrelamento', defaultRole: 'REP 1', label: 'A06 — REP 1 Atrel.' },

  // FECHAMENTO CPT (F04 - F07)
  { code: 'F04', area: 'fechamento_cpt', areaName: 'Fechamento CPT', defaultRole: 'REP 1', label: 'F04 — REP 1 CPT' },
  { code: 'F05', area: 'fechamento_cpt', areaName: 'Fechamento CPT', defaultRole: 'REP 1', label: 'F05 — REP 1 CPT' },
  { code: 'F06', area: 'fechamento_cpt', areaName: 'Fechamento CPT', defaultRole: 'REP 1', label: 'F06 — REP 1 CPT' },
  { code: 'F07', area: 'fechamento_cpt', areaName: 'Fechamento CPT', defaultRole: 'REP 1', label: 'F07 — REP 1 CPT' },

  // MESAS OPS (O01 - O02)
  { code: 'O01', area: 'ops', areaName: 'Mesa Ops 2', defaultRole: 'Ops II', label: 'Mesa Ops 2' },
  { code: 'O02', area: 'ops', areaName: 'Mesa Ops 3', defaultRole: 'Ops III', label: 'Mesa Ops 3' }
];

// Available Ops Supervisors for selection
const DEFAULT_OPS_SUPERVISORS = [
  'Pedro',
  'Aline',
  'Mateus',
  'Edivania',
  'Érica',
  'Thiago',
  'Isabelle',
  'Silvio'
];

// Initial Ops Supervisors per sector
const DEFAULT_OPS_SECTOR_ASSIGNMENTS = {
  buffer: 'Pedro',
  ilhas: 'Aline',
  oportunidades: 'Mateus',
  atrelamento: 'Edivania',
  fechamento_aut: 'Érica',
  fechamento_cpt: 'Thiago'
};

// Escala Oficial de Folgas por Data (Agosto / 2026)
const ESCALA_FOLGAS_AGOSTO_2026 = {
  '2026-08-01': 'AA',
  '2026-08-02': 'AB',
  '2026-08-03': 'AB',
  '2026-08-04': 'AC',
  '2026-08-05': 'AC',
  '2026-08-06': 'AD',
  '2026-08-07': 'AD',
  '2026-08-08': 'AA',
  '2026-08-09': 'AA',
  '2026-08-10': 'AB', // HOJE: Folga Turma AB (Amarelo)
  '2026-08-11': 'AB',
  '2026-08-12': 'AC',
  '2026-08-13': 'AA',
  '2026-08-14': 'AD',
  '2026-08-15': 'AD',
  '2026-08-16': 'AC',
  '2026-08-17': 'AA',
  '2026-08-18': 'AB',
  '2026-08-19': 'AB',
  '2026-08-20': 'AC',
  '2026-08-21': 'AC',
  '2026-08-22': 'AD',
  '2026-08-23': 'AD',
  '2026-08-24': 'AA',
  '2026-08-25': 'AA',
  '2026-08-26': 'AB',
  '2026-08-27': 'AB',
  '2026-08-28': 'AC',
  '2026-08-29': 'AC',
  '2026-08-30': 'AD',
  '2026-08-31': 'AD'
};

// Raw Operator Data (130 real operators)
const RAW_OPERATORS_LIST = [
  { name: "ADINALDO ALCANTARA DE SANTANA", re: "2563526", turma: "AB" },
  { name: "ADRIANA BRITO DA SILVA", re: "1952083", turma: "AA" },
  { name: "ALESSANDRO ELIAS COVRE", re: "2630387", turma: "AB" },
  { name: "ALEXSANDRO LOPES DA SILVA", re: "1901492", turma: "AC" },
  { name: "ALICE DO NASCIMENTO", re: "1870442", turma: "AC" },
  { name: "ALICE DO SACRAMENTO SOUZA", re: "2316166", turma: "AD" },
  { name: "ALINE SOUZA DE JESUS", re: "469848", turma: "AD" },
  { name: "AMANDA TAVARES SANTOS", re: "474989", turma: "AC" },
  { name: "ANA CELIA BREDA FERREIRA", re: "2626999", turma: "AA" },
  { name: "ANA PAULA VAZ", re: "481416", turma: "B" },
  { name: "ANDERSON DOS SANTOS PEREIRA", re: "299534", turma: "AB" },
  { name: "ANDREA BARROS DE AGUIAR", re: "2316161", turma: "AC" },
  { name: "ANDREIA BRITO", re: "2563467", turma: "AB" },
  { name: "ANDREIA GONCALVES DOS SANTOS", re: "2567878", turma: "AC" },
  { name: "ANDRESSA DA SILVA AMORIM", re: "2443928", turma: "AA" },
  { name: "BARBARA DA COSTA", re: "2403053", turma: "AC" },
  { name: "BIANCA APARECIDA DA SILVA FERREIRA", re: "2626949", turma: "AC" },
  { name: "BIANCA ROSA DOS SANTOS", re: "2563919", turma: "AA" },
  { name: "BRENDA PATRICIA DO NASCIMENTO TAVARES", re: "2107954", turma: "AC" },
  { name: "BRUNO DE SOUSA OLIVEIRA LEITE", re: "2563469", turma: "AC" },
  { name: "BRUNO EDUARDO", re: "2115262", turma: "AD" },
  { name: "CAIRO CABRAL DE OLIVEIRA", re: "2627003", turma: "AC" },
  { name: "CAMILA BARBOSA SA SOUZA", re: "2430889", turma: "AD" },
  { name: "CAMILI VITORIA GOULART", re: "2431683", turma: "AB" },
  { name: "CARLOS EDUARDO COSTA DO NASCIMENTO", re: "2628990", turma: "AB" },
  { name: "CAROLINA DIAS BRANDAO", re: "2286287", turma: "AD" },
  { name: "CASSIA HELEN GOMES DA SILVA", re: "2453183", turma: "AB" },
  { name: "CIBELE PRISCILA NEPOMUCENO", re: "2286251", turma: "AD" },
  { name: "DAVI DE OLIVEIRA SILVA", re: "2115455", turma: "AB" },
  { name: "DEBORA LAVINIA DA SILVA BRASILEIRO", re: "2021050", turma: "AA" },
  { name: "EDVANIA MARIA FELIX CIRIACO", re: "550249", turma: "AD" },
  { name: "ELIZABETH SILVA LIMA", re: "2626952", turma: "AA" },
  { name: "ELTON PEREIRA GONCALVES", re: "2379542", turma: "AA" },
  { name: "EMILLY DE SOUZA ALBUQUERQUE", re: "2567554", turma: "AC" },
  { name: "ERIC GABRIEL GAMA BINANCHESKI", re: "2095214", turma: "AD" },
  { name: "ERICA LIMA DA ROCHA", re: "378027", turma: "AC" },
  { name: "ESTEFANY GABRIELLE SILVA DE SOUZA", re: "2107946", turma: "AC" },
  { name: "EZEQUIAS FREITAS", re: "2563948", turma: "AC" },
  { name: "FABIANE CRISTINA GEMBRO DOMINGOS", re: "2582705", turma: "AD" },
  { name: "FABIANO CONTINI", re: "2626864", turma: "AB" },
  { name: "FABIO POLIZELO DE LIMA", re: "2115296", turma: "B" },
  { name: "FABOOLA BRAGA VIEIRA DOS SANTOS", re: "2224068", turma: "AB" },
  { name: "FERNANDA CARDOSO DOS SANTOS", re: "2627018", turma: "AC" },
  { name: "FILIPI SANTOS BARBOSA", re: "2567990", turma: "AC" },
  { name: "FRANCISCA SILVA PEREIRA", re: "2108139", turma: "AC" },
  { name: "GABRIEL CATANHO COUTO DA SILVA", re: "2626960", turma: "AC" },
  { name: "GIORLANDA ALVES DA SILVA", re: "2443906", turma: "AD" },
  { name: "GRAZIELLE SANTOS SOUZA", re: "2627005", turma: "AC" },
  { name: "HELEN BASTOS BOREL", re: "2107952", turma: "AA" },
  { name: "HENRIQUE SILVA FONTES", re: "2115160", turma: "AA" },
  { name: "INGRID LINO DE BRITO", re: "2626998", turma: "AA" },
  { name: "INGRID ZANINI SANTOS", re: "2286280", turma: "AB" },
  { name: "ISABELLE SILVA E SILVA", re: "2563892", turma: "AA" },
  { name: "ISMAEL BATISTA DOS SANTOS", re: "2443901", turma: "AD" },
  { name: "ISRAEL FERREIRA DOS SANTOS", re: "2107949", turma: "AA" },
  { name: "IVANILDA SANTOS SILVA", re: "2107963", turma: "AB" },
  { name: "JAILTON SENA DE JESUS", re: "2316187", turma: "AD" },
  { name: "JARDIELE OSTERNES BARBOSA PEREIRA", re: "2626868", turma: "AB" },
  { name: "JESSICA SILVA DE ANDRADE", re: "2567888", turma: "AC" },
  { name: "JOAO FARIAS", re: "2107947", turma: "AA" },
  { name: "JOAO SOUSA FARIAS", re: "2453186", turma: "AB" },
  { name: "JOSE FILHO DA SILVA RIBEIRO", re: "2443932", turma: "AD" },
  { name: "JOSE SILVA FREITAS", re: "2115189", turma: "AA" },
  { name: "JUAN SILVA DO NASCIMENTO", re: "2107948", turma: "AA" },
  { name: "JULIANA SANTOS MARQUES", re: "2567887", turma: "AC" },
  { name: "JULIANO BAPTISTA MACIEL DE ABREU", re: "2115166", turma: "AA" },
  { name: "JUSSARA SILVA DOS SANTOS", re: "2443929", turma: "AD" },
  { name: "KAIQUE APRIGIO MACHADO SILVA", re: "2567873", turma: "AA" },
  { name: "KATHERINE JANAINA MENDONCA", re: "2567862", turma: "AC" },
  { name: "KAUAN BAPTISTA SILVA", re: "2108138", turma: "AA" },
  { name: "KELI SILVA GOUVEIA", re: "2563893", turma: "AA" },
  { name: "KELVIN SANTOS SILVA", re: "2443916", turma: "AD" },
  { name: "KETHELEN SANTOS", re: "2567993", turma: "AC" },
  { name: "LARA SILVA DOS SANTOS", re: "2286282", turma: "AB" },
  { name: "LARISSA SANTOS SOUSA", re: "2286288", turma: "AB" },
  { name: "LILIANE ALMEIDA DA SILVA", re: "2563914", turma: "AA" },
  { name: "LINDON LEITE DE MORAIS", re: "2286285", turma: "AB" },
  { name: "LORHANY SILVA CUNHA DOS SANTOS", re: "2567882", turma: "AC" },
  { name: "LUCAS OLIVEIRA ROCHA", re: "2443915", turma: "AD" },
  { name: "LUCIVANIA SILVA COSTA", re: "2567889", turma: "AC" },
  { name: "LUIZ SANTOS DA SILVA", re: "2630386", turma: "AB" },
  { name: "LUIZ VITURINO PEREIRA DOS SANTOS", re: "2108151", turma: "AA" },
  { name: "LUZIA NASCIMENTO DA SILVA", re: "2107955", turma: "AB" },
  { name: "MARCELO COSTA GOMES", re: "2443920", turma: "AD" },
  { name: "MARCELO SILVA PEREIRA", re: "2443936", turma: "AD" },
  { name: "MARIA ANDRADE DOS SANTOS", re: "2443909", turma: "AD" },
  { name: "MARIA DUARTE DA SILVA PEREIRA", re: "2115167", turma: "AA" },
  { name: "MARIA GONCALVES DOS SANTOS SILVA", re: "2630388", turma: "AB" },
  { name: "MARIA JESUS DOS SANTOS", re: "2563468", turma: "AB" },
  { name: "MARIA LIMA DOS SANTOS", re: "2563915", turma: "AA" },
  { name: "MARIA SOUZA DA ANUNCIACAO", re: "2567876", turma: "AC" },
  { name: "MARINICE MOREIRA SOARES SILVA", re: "2567883", turma: "AC" },
  { name: "MARKUS SANTOS LEAL REIS", re: "2443917", turma: "AD" },
  { name: "MATHEUS FERREIRA DA SILVA", re: "2567877", turma: "AC" },
  { name: "MATHEUS NOMURA DO NASCIMENTO", re: "2443919", turma: "AD" },
  { name: "MAYSA OLIVEIRA DE JESUS", re: "2567872", turma: "AC" },
  { name: "MAYRA FABRICIO DE PAULA", re: "2443910", turma: "AD" },
  { name: "MONICA SANTOS SILVA", re: "2567880", turma: "AC" },
  { name: "NAYOMI MELO COUTINHO SEVERO", re: "2443925", turma: "AD" },
  { name: "NAIARA SANTOS NASCIMENTO", re: "2563503", turma: "AB" },
  { name: "OSVALDO GONCALVES DOS SANTOS", re: "2567884", turma: "AC" },
  { name: "PABLO CINTRA PINTO LEITE", re: "2443905", turma: "AD" },
  { name: "PATRICIA JESUS DA SILVA", re: "2630385", turma: "AB" },
  { name: "PEDRO BARBOZA DE ANDRADE ALVES", re: "2567870", turma: "AC" },
  { name: "PEDRO VASCONCELOS DE OLIVEIRA", re: "2115161", turma: "AA" },
  { name: "RAIMUNDO SILVA DOS SANTOS", re: "2563912", turma: "AA" },
  { name: "RAYSSA JESUS PEREIRA", re: "2567874", turma: "AC" },
  { name: "RICARDO GONCALVES DOS SANTOS", re: "2567866", turma: "AC" },
  { name: "RICHARD SILVA OLIVEIRA", re: "2563918", turma: "AA" },
  { name: "RENATO MARIANO DA SILVA", re: "2630384", turma: "AB" },
  { name: "ROBERTA OLIVEIRA DE FREITAS", re: "2563920", turma: "AA" },
  { name: "SAMUEL RUIZ COSTA SILVA", re: "2443921", turma: "AD" },
  { name: "SILMARA ALVES DA SILVA", re: "2563916", turma: "AA" },
  { name: "SILVIA ALMEIDA BRITO DE SOUZA", re: "2563502", turma: "AB" },
  { name: "SILVIO JESUS DOS SANTOS", re: "2115159", turma: "AA" },
  { name: "SARA MARIANO DE SOUSA", re: "2567867", turma: "AC" },
  { name: "SUELI SILVA NASCIMENTO", re: "2563527", turma: "AB" },
  { name: "SUEMILYN SILVA BARBOSA", re: "2563917", turma: "AA" },
  { name: "TALITHA SILVA OLIVEIRA", re: "2563466", turma: "AB" },
  { name: "TATIANE LIMA DE SOUZA", re: "2443904", turma: "AD" },
  { name: "THIAGO SANTOS SILVA", re: "2567879", turma: "AC" },
  { name: "THIAGO VALE BARBOZA LEITE", re: "2563913", turma: "AA" },
  { name: "VALDIR BERGAMO JUNIOR", re: "2115162", turma: "AA" },
  { name: "VITOR ALENCAR PEREIRA", re: "2563910", turma: "AA" },
  { name: "WALLISSON OLIVEIRA MACIEL", re: "2563911", turma: "AA" },
  { name: "WEVERTON FIGUEIREDO MARTINS", re: "2563921", turma: "AA" },
  { name: "WILLIAM GOMES SILVA", re: "2563500", turma: "AB" },
  { name: "YASMIN SILVA DE OLIVEIRA", re: "2115165", turma: "AA" }
];

// Initial pre-allocation map of active positions
const INITIAL_SLOT_ASSIGNMENTS = [
  // BUFFER
  { posCode: 'B01', zone: 'buffer_guardioes', role: 'Guardião do Buffer' },
  { posCode: 'B02', zone: 'buffer_guardioes', role: 'Guardião do Buffer' },
  { posCode: 'B07', zone: 'buffer_saida', role: 'Atrelamento Buffer' },
  { posCode: 'B08', zone: 'buffer_saida', role: 'Atrelamento Buffer' },
  { posCode: 'B03', zone: 'buffer_saida', role: 'Buffer de Saída' },
  { posCode: 'B04', zone: 'buffer_saida', role: 'Buffer de Saída' },
  { posCode: 'B05', zone: 'buffer_saida', role: 'Buffer de Saída' },
  { posCode: 'B06', zone: 'buffer_saida', role: 'Buffer de Saída' },

  // PROSPERIDADE
  { posCode: 'P01', zone: 'oportunidades', role: 'REP 1' },
  { posCode: 'P02', zone: 'oportunidades', role: 'REP 1' },
  { posCode: 'P03', zone: 'oportunidades', role: 'REP 1' },
  { posCode: 'P04', zone: 'oportunidades', role: 'REP 1' },
  { posCode: 'P05', zone: 'oportunidades', role: 'REP 1' },

  // FECHAMENTO AUT
  { posCode: 'F01', zone: 'fechamento_aut', role: 'REP 1' },
  { posCode: 'F02', zone: 'fechamento_aut', role: 'REP 1' },

  // ATRELAMENTO (Ruas de CPTs)
  { posCode: 'A01', zone: 'atrelamento', role: 'REP 1' },
  { posCode: 'A02', zone: 'atrelamento', role: 'REP 1' },
  { posCode: 'A03', zone: 'atrelamento', role: 'REP 1' },
  { posCode: 'A04', zone: 'atrelamento', role: 'REP 1' },

  // FECHAMENTO CPT
  { posCode: 'F04', zone: 'fechamento_cpt', role: 'REP 1' },
  { posCode: 'F05', zone: 'fechamento_cpt', role: 'REP 1' },
  { posCode: 'F06', zone: 'fechamento_cpt', role: 'REP 1' },
  { posCode: 'F07', zone: 'fechamento_cpt', role: 'REP 1' },

  // MESAS OPS
  { posCode: 'O01', zone: 'ops', role: 'Ops II' },
  { posCode: 'O02', zone: 'ops', role: 'Ops III' }
];

// Add Ilhas positions I01 - I32 (16 bancadas x 2)
for (let b = 1; b <= 16; b++) {
  const codeA = `I${String((b - 1) * 2 + 1).padStart(2, '0')}`;
  const codeB = `I${String((b - 1) * 2 + 2).padStart(2, '0')}`;
  INITIAL_SLOT_ASSIGNMENTS.push({ posCode: codeA, zone: 'ilhas', role: 'REP 1', bancadaId: `bancada-${b}` });
  INITIAL_SLOT_ASSIGNMENTS.push({ posCode: codeB, zone: 'ilhas', role: 'REP 1', bancadaId: `bancada-${b}` });
}

// Generate Initial Operators array with Turma, Janta & Folga Rules
function generateInitialOperators(dateStr = '2026-08-10') {
  const folgaTurmaToday = ESCALA_FOLGAS_AGOSTO_2026[dateStr] || 'AB';

  let slotIndex = 0;

  return RAW_OPERATORS_LIST.map((raw, idx) => {
    const isOff = (raw.turma === folgaTurmaToday);
    
    let role = 'REP 1';
    if (idx % 15 === 0) role = 'Líder Operacional';

    const jantar = (idx % 2 === 0) ? '18:30' : '19:30';

    let zone = 'inactive';
    let status = 'OFF';
    let posCode = null;
    let bancadaId = null;

    if (!isOff) {
      status = 'PRESENT';
      if (idx === 7) {
        status = 'SYNERGY_EXT';
        zone = 'external_synergy';
      } else if (slotIndex < INITIAL_SLOT_ASSIGNMENTS.length) {
        const slot = INITIAL_SLOT_ASSIGNMENTS[slotIndex++];
        zone = slot.zone;
        posCode = slot.posCode;
        role = slot.role || 'REP 1';
        bancadaId = slot.bancadaId || null;
      } else {
        zone = 'dock';
      }
    } else {
      // For off operators, associate their default seat so return from folga restores it
      if (slotIndex < INITIAL_SLOT_ASSIGNMENTS.length) {
        const slot = INITIAL_SLOT_ASSIGNMENTS[slotIndex++];
        posCode = slot.posCode;
        bancadaId = slot.bancadaId || null;
      }
    }

    const opObj = {
      id: `op-${idx + 1}`,
      name: raw.name,
      re: raw.re,
      turma: raw.turma,
      role: role,
      shift: 'Turno 2 (14h-23h)',
      jantar: jantar,
      zone: zone,
      posCode: posCode,
      bancadaId: bancadaId,
      lastBancadaId: bancadaId,
      lastPosCode: posCode,
      lastWorkingZone: (zone !== 'inactive') ? zone : (bancadaId ? 'ilhas' : 'dock'),
      status: status,
      avatar: (idx % 4) + 1
    };

    return opObj;
  });
}

// Persistence Utilities for Operators
function loadOperatorsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY_OPERATORS);
  if (!data) {
    const initial = generateInitialOperators('2026-08-10');
    saveOperatorsToStorage(initial);
    return initial;
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    const initial = generateInitialOperators('2026-08-10');
    return initial;
  }
}

function saveOperatorsToStorage(operators) {
  localStorage.setItem(STORAGE_KEY_OPERATORS, JSON.stringify(operators));
}

// Persistence Utilities for Ops Supervisors
function loadOpsSupervisorsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY_OPS_SUPERVISORS);
  if (!data) {
    saveOpsSupervisorsToStorage(DEFAULT_OPS_SECTOR_ASSIGNMENTS);
    return { ...DEFAULT_OPS_SECTOR_ASSIGNMENTS };
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return { ...DEFAULT_OPS_SECTOR_ASSIGNMENTS };
  }
}

function saveOpsSupervisorsToStorage(supervisorsObj) {
  localStorage.setItem(STORAGE_KEY_OPS_SUPERVISORS, JSON.stringify(supervisorsObj));
}

// Persistence Utilities for Fixed Groups
function loadFixedGroupsFromStorage() {
  const data = localStorage.getItem(STORAGE_KEY_FIXED_GROUPS);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

function saveFixedGroupsToStorage(groups) {
  localStorage.setItem(STORAGE_KEY_FIXED_GROUPS, JSON.stringify(groups));
}

function linkGroupInStorage(opIds) {
  if (!Array.isArray(opIds) || opIds.length === 0) return [];
  const groups = loadFixedGroupsFromStorage();
  const opSet = new Set(opIds);
  const filtered = groups.filter(g => !g.opIds.some(id => opSet.has(id)));
  
  filtered.push({
    id: `group-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    opIds: [...opIds],
    createdAt: new Date().toISOString()
  });
  
  saveFixedGroupsToStorage(filtered);
  return filtered;
}

function unlinkGroupInStorage(opId) {
  const groups = loadFixedGroupsFromStorage();
  const filtered = groups.filter(g => !g.opIds.includes(opId));
  saveFixedGroupsToStorage(filtered);
  return filtered;
}

function getGroupForOperator(opId, groupsList = null) {
  const groups = groupsList || loadFixedGroupsFromStorage();
  return groups.find(g => g.opIds.includes(opId)) || null;
}

function resetToDefaultData(dateStr = '2026-08-10') {
  localStorage.removeItem(STORAGE_KEY_OPERATORS);
  localStorage.removeItem(STORAGE_KEY_OPS_SUPERVISORS);
  localStorage.removeItem(STORAGE_KEY_FIXED_GROUPS);
  const operators = generateInitialOperators(dateStr);
  saveOperatorsToStorage(operators);
  saveOpsSupervisorsToStorage(DEFAULT_OPS_SECTOR_ASSIGNMENTS);
  return operators;
}
