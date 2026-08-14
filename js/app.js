/* ==========================================================================
   OpSinergia REWORK - Main Controller (Mapa de Ocupação & Position Catalog B01-O02)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Application State
  let operators = loadOperatorsFromStorage();
  let opsSupervisors = loadOpsSupervisorsFromStorage();
  let fixedGroups = loadFixedGroupsFromStorage();
  let activeTab = 'tabMap';
  let activeStatusFilter = 'ALL';
  let activeTurma = 'ALL';
  let searchQuery = '';
  let draggedOpId = null;

  // Initialize Lucide Icons
  if (window.lucide) {
    lucide.createIcons();
  }

  // Set default date to 10/08/2026
  const dateInput = document.getElementById('dateSelect');
  if (dateInput) {
    dateInput.value = '2026-08-10';
    dateInput.addEventListener('change', (e) => {
      onDateChange(e.target.value);
    });
  }

  // Date Change Handler: Preserves Last Working Zone, Bench & Position and Restores on Return
  function onDateChange(selectedDate) {
    const folgaTurma = ESCALA_FOLGAS_AGOSTO_2026[selectedDate];
    if (folgaTurma) {
      operators.forEach(op => {
        if (op.turma === folgaTurma) {
          // Save active post & bancada before entering Folga
          if (op.zone !== 'inactive') {
            op.lastWorkingZone = op.zone;
            if (op.bancadaId) op.lastBancadaId = op.bancadaId;
            if (op.posCode) op.lastPosCode = op.posCode;
          }
          op.status = 'OFF';
          op.zone = 'inactive';
          op.bancadaId = null;
          op.posCode = null;
        } else {
          if (op.status === 'OFF') {
            op.status = 'PRESENT';
            // Restore exact last working post & bancada
            op.zone = op.lastWorkingZone || (op.lastBancadaId ? 'ilhas' : 'dock');
            op.bancadaId = op.lastBancadaId || null;
            op.posCode = op.lastPosCode || null;
          }
        }
      });

      // Restore Fixed Groups back together in Ilhas if any member returns to work
      fixedGroups = loadFixedGroupsFromStorage();
      fixedGroups.forEach(g => {
        const groupOps = operators.filter(o => g.opIds.includes(o.id));
        const activeGroupOps = groupOps.filter(o => o.status === 'PRESENT');
        if (activeGroupOps.length > 0) {
          const targetBench = activeGroupOps.find(o => o.lastBancadaId)?.lastBancadaId || activeGroupOps[0].bancadaId || `bancada-1`;
          activeGroupOps.forEach(o => {
            o.zone = 'ilhas';
            o.lastWorkingZone = 'ilhas';
            o.bancadaId = targetBench;
          });
        }
      });

      saveOperatorsToStorage(operators);
      renderAll();
    }
  }

  // --------------------------------------------------------------------------
  // Core Render & Calculation Pipeline
  // --------------------------------------------------------------------------
  function renderAll() {
    fixedGroups = loadFixedGroupsFromStorage();
    renderOpsSupervisors();
    renderKPIs();
    renderFloorPlan();
    renderTable();
    
    if (window.lucide) {
      lucide.createIcons();
    }
  }

  // Render & bind Ops Responsável Selectors
  function renderOpsSupervisors() {
    const sectors = ['buffer', 'ilhas', 'oportunidades', 'atrelamento', 'fechamento_aut', 'fechamento_cpt'];
    
    sectors.forEach(sec => {
      const selectEl = document.getElementById(`ops-select-${sec}`);
      if (!selectEl) return;

      const currentAssigned = opsSupervisors[sec] || DEFAULT_OPS_SUPERVISORS[0];
      let html = '';
      DEFAULT_OPS_SUPERVISORS.forEach(name => {
        html += `<option value="${name}" ${name === currentAssigned ? 'selected' : ''}>${name}</option>`;
      });

      // Add custom if not in list
      if (!DEFAULT_OPS_SUPERVISORS.includes(currentAssigned)) {
        html += `<option value="${currentAssigned}" selected>${currentAssigned}</option>`;
      }

      selectEl.innerHTML = html;

      // Event listener
      selectEl.onchange = (e) => {
        opsSupervisors[sec] = e.target.value;
        saveOpsSupervisorsToStorage(opsSupervisors);
      };
    });
  }

  function getFilteredOperators() {
    return operators.filter(op => {
      // Turma filter
      if (activeTurma !== 'ALL' && op.turma !== activeTurma) return false;

      // Status filter
      if (activeStatusFilter === 'PRESENT' && op.status !== 'PRESENT') return false;
      if (activeStatusFilter === 'SYNERGY' && op.status !== 'SYNERGY_EXT') return false;
      if (activeStatusFilter === 'OFF' && op.status !== 'OFF') return false;
      if (activeStatusFilter === 'ABSENT' && op.status !== 'ABSENT') return false;

      // Search query
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchName = op.name.toLowerCase().includes(q);
        const matchRE = op.re.toLowerCase().includes(q);
        const matchRole = op.role.toLowerCase().includes(q);
        const matchTurma = op.turma.toLowerCase().includes(q);
        const matchPosCode = op.posCode ? op.posCode.toLowerCase().includes(q) : false;
        if (!matchName && !matchRE && !matchRole && !matchTurma && !matchPosCode) return false;
      }

      return true;
    });
  }

  // --------------------------------------------------------------------------
  // KPI Calculations
  // --------------------------------------------------------------------------
  function renderKPIs() {
    const currentOps = operators.filter(op => {
      if (activeTurma !== 'ALL' && op.turma !== activeTurma) return false;
      return true;
    });

    const totalScaled = currentOps.length;
    const externalSynergyOps = currentOps.filter(op => op.status === 'SYNERGY_EXT' || op.zone === 'external_synergy');
    const offOps = currentOps.filter(op => op.status === 'OFF' || op.zone === 'inactive');
    const absentOps = currentOps.filter(op => op.status === 'ABSENT');

    // Dinner counters
    const workingOps = currentOps.filter(op => op.status === 'PRESENT' || op.status === 'SYNERGY_EXT');
    const jantar18Count = workingOps.filter(op => op.jantar === '18:30').length;
    const jantar19Count = workingOps.filter(op => op.jantar === '19:30').length;

    const totalScaledEl = document.getElementById('kpiTotalScaled');
    if (totalScaledEl) totalScaledEl.textContent = totalScaled;

    const extEl = document.getElementById('kpiExternalSynergy');
    if (extEl) extEl.textContent = externalSynergyOps.length;

    const offEl = document.getElementById('kpiOffAbsent');
    if (offEl) offEl.textContent = offOps.length + absentOps.length;

    const offSubEl = document.getElementById('kpiOffAbsentSub');
    if (offSubEl) offSubEl.textContent = `${offOps.length} Folgas${absentOps.length > 0 ? ' | ' + absentOps.length + ' Faltas' : ''}`;

    const j18El = document.getElementById('kpiJantar18');
    if (j18El) j18El.textContent = jantar18Count;

    const j19El = document.getElementById('kpiJantar19');
    if (j19El) j19El.textContent = jantar19Count;
  }

  // --------------------------------------------------------------------------
  // Render Tab 1: 2D Spatial Blueprint Floor Plan with Position Codes (B01-O02)
  // --------------------------------------------------------------------------
  function renderFloorPlan() {
    const filteredOps = getFilteredOperators();

    // Map operators by posCode for instant slot lookup
    const opsByPosCode = new Map();
    const opsByZone = {
      buffer_guardioes: [], buffer_saida: [], ilhas: [],
      oportunidades: [], atrelamento: [], fechamento_aut: [],
      fechamento_cpt: [], ops: [], dock: [], external_synergy: [], inactive: []
    };

    filteredOps.forEach(op => {
      let z = op.zone || 'dock';
      if (z === 'buffer') z = 'buffer_guardioes';

      if (op.posCode) {
        opsByPosCode.set(op.posCode, op);
      }

      if (opsByZone[z]) {
        opsByZone[z].push(op);
      } else if (op.status === 'OFF' || op.status === 'ABSENT') {
        opsByZone.inactive.push(op);
      } else {
        opsByZone.dock.push(op);
      }
    });

    // 1. Render all Fixed Blueprint Slots (Non-Ilhas)
    const fixedSlotDefinitions = [
      // Fechamento AUT
      { id: 'slot-F01', posCode: 'F01', zone: 'fechamento_aut', role: 'REP 1' },
      { id: 'slot-F02', posCode: 'F02', zone: 'fechamento_aut', role: 'REP 1' },

      // Buffer - Prosperidade (5 posições P01-P05)
      { id: 'slot-P01', posCode: 'P01', zone: 'oportunidades', role: 'REP 1' },
      { id: 'slot-P02', posCode: 'P02', zone: 'oportunidades', role: 'REP 1' },
      { id: 'slot-P03', posCode: 'P03', zone: 'oportunidades', role: 'REP 1' },
      { id: 'slot-P04', posCode: 'P04', zone: 'oportunidades', role: 'REP 1' },
      { id: 'slot-P05', posCode: 'P05', zone: 'oportunidades', role: 'REP 1' },

      // Buffer - Atrelamento Buffer (B07, B08)
      { id: 'slot-B07', posCode: 'B07', zone: 'buffer_saida', role: 'Atrelamento Buffer' },
      { id: 'slot-B08', posCode: 'B08', zone: 'buffer_saida', role: 'Atrelamento Buffer' },

      // Buffer - Buffer de Saída (B03-B06)
      { id: 'slot-B03', posCode: 'B03', zone: 'buffer_saida', role: 'Buffer de Saída' },
      { id: 'slot-B04', posCode: 'B04', zone: 'buffer_saida', role: 'Buffer de Saída' },
      { id: 'slot-B05', posCode: 'B05', zone: 'buffer_saida', role: 'Buffer de Saída' },
      { id: 'slot-B06', posCode: 'B06', zone: 'buffer_saida', role: 'Buffer de Saída' },

      // Buffer - Guardiões (B01, B02)
      { id: 'slot-B01', posCode: 'B01', zone: 'buffer_guardioes', role: 'Guardião do Buffer' },
      { id: 'slot-B02', posCode: 'B02', zone: 'buffer_guardioes', role: 'Guardião do Buffer' },

      // Mesas Ops (O01, O02)
      { id: 'slot-O01', posCode: 'O01', zone: 'ops', role: 'Ops II' },
      { id: 'slot-O02', posCode: 'O02', zone: 'ops', role: 'Ops III' },

      // Fechamento CPT (F04-F07)
      { id: 'slot-F04', posCode: 'F04', zone: 'fechamento_cpt', role: 'REP 1' },
      { id: 'slot-F05', posCode: 'F05', zone: 'fechamento_cpt', role: 'REP 1' },
      { id: 'slot-F06', posCode: 'F06', zone: 'fechamento_cpt', role: 'REP 1' },
      { id: 'slot-F07', posCode: 'F07', zone: 'fechamento_cpt', role: 'REP 1' }
    ];

    fixedSlotDefinitions.forEach(slotDef => {
      const containerEl = document.getElementById(slotDef.id);
      if (!containerEl) return;
      containerEl.innerHTML = '';

      const op = opsByPosCode.get(slotDef.posCode) || 
                 opsByZone[slotDef.zone]?.find(o => !o.posCode && o.status === 'PRESENT');

      if (op) {
        op.posCode = slotDef.posCode;
        op.zone = slotDef.zone;
        containerEl.appendChild(createSmallOperatorCardEl(op, slotDef.posCode));
      } else {
        containerEl.appendChild(createEmptySlotEl(slotDef.posCode, slotDef.zone, slotDef.role));
      }
    });

    // 2. Render Atrelamento Section (Ruas 1 & 2 de CPTs)
    renderAtrelamentoSection(opsByZone.atrelamento || []);

    // 3. Render Ilhas 4x4 Grid (16 Bancadas = 32 Posições Físicas)
    renderIlhasGrid(opsByPosCode, opsByZone.ilhas);

    // 4. Render Support Panels (Pool, Sinergia, Inativos)
    renderSupportPanels(opsByZone);

    // 5. Update Zone Count Badges
    const bufferCount = (opsByZone.buffer_guardioes.length + opsByZone.buffer_saida.length);
    const countBufferEl = document.getElementById('count-buffer');
    if (countBufferEl) countBufferEl.textContent = bufferCount;

    const countIlhasEl = document.getElementById('count-ilhas');
    if (countIlhasEl) countIlhasEl.textContent = opsByZone.ilhas.length;

    const countDockEl = document.getElementById('count-dock');
    if (countDockEl) countDockEl.textContent = opsByZone.dock.length;

    const countExtEl = document.getElementById('count-ext-synergy');
    if (countExtEl) countExtEl.textContent = opsByZone.external_synergy.length;

    const countInactiveEl = document.getElementById('count-inactive');
    if (countInactiveEl) countInactiveEl.textContent = opsByZone.inactive.length;

    setupDragAndDrop();
  }

  // --------------------------------------------------------------------------
  // Render Atrelamento: Ruas 1 & 2 de CPTs com suporte flexível a múltiplos REPs
  // --------------------------------------------------------------------------
  function renderAtrelamentoSection(atrelamentoOpsList) {
    const secEl = document.getElementById('sec-atrelamento');
    if (!secEl) return;

    const countEl = document.getElementById('count-atrelamento');
    if (countEl) {
      countEl.textContent = `${atrelamentoOpsList.length} ${atrelamentoOpsList.length === 1 ? 'rep' : 'reps'}`;
    }

    // Drag events on the overall atrelamento section
    secEl.ondragover = (e) => {
      e.preventDefault();
      e.stopPropagation();
      secEl.classList.add('drag-over');
    };
    secEl.ondragleave = (e) => {
      if (!secEl.contains(e.relatedTarget)) {
        secEl.classList.remove('drag-over');
      }
    };
    secEl.ondrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      secEl.classList.remove('drag-over');
      if (draggedOpId) {
        moveOperatorToZone(draggedOpId, 'atrelamento');
      }
    };

    // Separate operators into Rua 1 (A01, A02, A05, ...) and Rua 2 (A03, A04, A06, ...)
    const rua1Ops = [];
    const rua2Ops = [];

    atrelamentoOpsList.forEach(op => {
      if (op.posCode === 'A01' || op.posCode === 'A02' || op.posCode === 'A05' || op.posCode === 'A07') {
        rua1Ops.push(op);
      } else if (op.posCode === 'A03' || op.posCode === 'A04' || op.posCode === 'A06' || op.posCode === 'A08') {
        rua2Ops.push(op);
      } else {
        if (rua1Ops.length <= rua2Ops.length) {
          rua1Ops.push(op);
        } else {
          rua2Ops.push(op);
        }
      }
    });

    // Helper to render a Rua
    function renderRua(ruaNum, ruaOps, containerId, defaultCodes) {
      const container = document.getElementById(containerId);
      if (!container) return;
      container.innerHTML = '';

      const ruaBlock = container.closest('.bp-atrel-rua-block');
      if (ruaBlock) {
        ruaBlock.ondragover = (e) => {
          e.preventDefault();
          e.stopPropagation();
          ruaBlock.classList.add('drag-over');
        };
        ruaBlock.ondragleave = (e) => {
          if (!ruaBlock.contains(e.relatedTarget)) {
            ruaBlock.classList.remove('drag-over');
          }
        };
        ruaBlock.ondrop = (e) => {
          e.preventDefault();
          e.stopPropagation();
          ruaBlock.classList.remove('drag-over');
          if (draggedOpId) {
            const usedCodes = new Set(atrelamentoOpsList.map(o => o.posCode));
            const assignedCode = defaultCodes.find(c => !usedCodes.has(c)) || (ruaNum === 1 ? 'A05' : 'A06');
            moveOperatorToZone(draggedOpId, 'atrelamento', null, assignedCode);
          }
        };
      }

      // Render occupied operator cards
      ruaOps.forEach((op, idx) => {
        const posCode = op.posCode || defaultCodes[idx] || (ruaNum === 1 ? `A0${idx * 2 + 1}` : `A0${idx * 2 + 2}`);
        op.posCode = posCode;
        op.zone = 'atrelamento';
        container.appendChild(createSmallOperatorCardEl(op, posCode));
      });

      // If fewer than default slots, show empty slot placeholders
      if (ruaOps.length < defaultCodes.length) {
        for (let i = ruaOps.length; i < defaultCodes.length; i++) {
          const code = defaultCodes[i];
          container.appendChild(createEmptySlotEl(code, 'atrelamento', 'REP 1'));
        }
      }

      // Explicit Add REP button for this rua
      const addRuaBtn = document.createElement('div');
      addRuaBtn.className = 'bp-atrel-add-target';
      addRuaBtn.innerHTML = `<span>+ REP Rua ${ruaNum}</span>`;
      addRuaBtn.title = `Clique ou arraste um operador para adicionar à Rua ${ruaNum} do Atrelamento`;
      addRuaBtn.onclick = (e) => {
        e.stopPropagation();
        addOperatorToAtrelamento(ruaNum);
      };
      addRuaBtn.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addRuaBtn.classList.add('drag-over');
      };
      addRuaBtn.ondragleave = (e) => {
        e.stopPropagation();
        addRuaBtn.classList.remove('drag-over');
      };
      addRuaBtn.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        addRuaBtn.classList.remove('drag-over');
        if (draggedOpId) {
          const usedCodes = new Set(atrelamentoOpsList.map(o => o.posCode));
          const assignedCode = defaultCodes.find(c => !usedCodes.has(c)) || (ruaNum === 1 ? 'A05' : 'A06');
          moveOperatorToZone(draggedOpId, 'atrelamento', null, assignedCode);
        }
      };
      container.appendChild(addRuaBtn);
    }

    renderRua(1, rua1Ops, 'atrel-rua-1-slots', ['A01', 'A02']);
    renderRua(2, rua2Ops, 'atrel-rua-2-slots', ['A03', 'A04']);

    // General Add REP Button for the entire Atrelamento section
    const generalAddBtn = document.getElementById('btn-add-atrelamento');
    if (generalAddBtn) {
      generalAddBtn.onclick = (e) => {
        e.stopPropagation();
        addOperatorToAtrelamento(null);
      };
      generalAddBtn.ondragover = (e) => {
        e.preventDefault();
        e.stopPropagation();
        generalAddBtn.classList.add('drag-over');
      };
      generalAddBtn.ondragleave = (e) => {
        e.stopPropagation();
        generalAddBtn.classList.remove('drag-over');
      };
      generalAddBtn.ondrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        generalAddBtn.classList.remove('drag-over');
        if (draggedOpId) {
          moveOperatorToZone(draggedOpId, 'atrelamento');
        }
      };
    }
  }

  // Helper to add operator directly to atrelamento from Pool or modal
  function addOperatorToAtrelamento(ruaNum = null) {
    const poolOp = operators.find(o => o.zone === 'dock' && o.status === 'PRESENT');
    if (poolOp) {
      const atrelOps = operators.filter(o => o.zone === 'atrelamento' && o.status === 'PRESENT');
      const usedCodes = new Set(atrelOps.map(o => o.posCode));
      let targetCode = null;
      if (ruaNum === 1) {
        targetCode = ['A01', 'A02', 'A05', 'A07'].find(c => !usedCodes.has(c)) || 'A05';
      } else if (ruaNum === 2) {
        targetCode = ['A03', 'A04', 'A06', 'A08'].find(c => !usedCodes.has(c)) || 'A06';
      } else {
        targetCode = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06'].find(c => !usedCodes.has(c)) || 'A05';
      }
      moveOperatorToZone(poolOp.id, 'atrelamento', null, targetCode);
    } else {
      openOperatorModal(null);
    }
  }

  // --------------------------------------------------------------------------
  // Render Ilhas: 16 Bancadas in 4x4 Grid (Suporte a 2, 3 ou mais operadores por bancada)
  // --------------------------------------------------------------------------
  function renderIlhasGrid(opsByPosCode, ilhasOpsList) {
    const gridContainer = document.getElementById('ilhasGridContainer');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    fixedGroups = loadFixedGroupsFromStorage();

    // Map operators to their assigned bancadaId
    const bancadaMap = new Map();
    for (let b = 1; b <= 16; b++) {
      bancadaMap.set(`bancada-${b}`, []);
    }

    // 1. Assign operators that already have bancadaId or posCode
    ilhasOpsList.forEach(op => {
      let bId = op.bancadaId;
      if (!bId && op.posCode && op.posCode.startsWith('I')) {
        const num = parseInt(op.posCode.replace('I', ''), 10);
        if (!isNaN(num)) {
          const benchNum = Math.min(16, Math.max(1, Math.ceil(num / 2)));
          bId = `bancada-${benchNum}`;
          op.bancadaId = bId;
        }
      }
      if (!bId) {
        // Find first bench with less than 2 ops
        for (let b = 1; b <= 16; b++) {
          const candidateId = `bancada-${b}`;
          if (bancadaMap.get(candidateId).length < 2) {
            bId = candidateId;
            op.bancadaId = bId;
            break;
          }
        }
      }
      if (!bId) bId = 'bancada-1';

      if (!bancadaMap.has(bId)) {
        bancadaMap.set(bId, []);
      }
      bancadaMap.get(bId).push(op);
    });

    // 2. Render each of the 16 Bancadas
    for (let b = 1; b <= 16; b++) {
      const bancadaId = `bancada-${b}`;
      const benchOps = bancadaMap.get(bancadaId) || [];
      const opIds = benchOps.map(o => o.id);

      // Check if all/any operators in this bench are part of a fixed group
      let isFixedGroup = false;
      if (benchOps.length >= 2) {
        const firstGroup = getGroupForOperator(benchOps[0].id, fixedGroups);
        if (firstGroup && benchOps.every(o => firstGroup.opIds.includes(o.id))) {
          isFixedGroup = true;
        }
      }

      // Check turma mismatch
      let hasMismatch = false;
      const distinctTurmas = [...new Set(benchOps.map(o => o.turma))];
      if (distinctTurmas.length > 1) {
        hasMismatch = true;
      }

      // Build Bancada Container
      const bancadaBox = document.createElement('div');
      bancadaBox.className = 'bp-bancada-card-unit' + (isFixedGroup ? ' is-fixed' : '') + (hasMismatch ? ' pair-mismatch' : '');
      bancadaBox.dataset.bancadaId = bancadaId;
      bancadaBox.dataset.zoneId = 'ilhas';

      // Drag events on the whole bancada container
      bancadaBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bancadaBox.classList.add('drag-over');
      });

      bancadaBox.addEventListener('dragleave', (e) => {
        if (!bancadaBox.contains(e.relatedTarget)) {
          bancadaBox.classList.remove('drag-over');
        }
      });

      bancadaBox.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        bancadaBox.classList.remove('drag-over');
        if (draggedOpId) {
          moveOperatorToZone(draggedOpId, 'ilhas', bancadaId);
        }
      });

      // Workbench Table Visual (Header with Bench ID, Operator Count in REPs, and Lock)
      const tableBar = document.createElement('div');
      tableBar.className = 'bp-workbench-table';
      tableBar.innerHTML = `
        <span class="bp-bench-id">B${b}</span>
        <span class="bp-bench-count">${benchOps.length} ${benchOps.length === 1 ? 'rep' : 'reps'}</span>
        <button class="bp-bench-lock-btn" title="${isFixedGroup ? '🔒 Grupo Fixado (clique para desvincular)' : '🔓 Fixar Grupo desta Bancada'}">
          ${isFixedGroup ? '🔒' : '🔓'}
        </button>
      `;

      // Lock toggle button handler for multi-operator group
      const lockBtn = tableBar.querySelector('.bp-bench-lock-btn');
      lockBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (benchOps.length < 2) {
          alert('É necessário ter ao menos 2 operadores na bancada para fixar o grupo.');
          return;
        }
        if (isFixedGroup) {
          unlinkGroupInStorage(benchOps[0].id);
        } else {
          linkGroupInStorage(benchOps.map(o => o.id));
        }
        renderAll();
      });

      bancadaBox.appendChild(tableBar);

      // Warning Bar for Mismatched Turmas (explaining why border is red)
      if (hasMismatch) {
        const warningEl = document.createElement('div');
        warningEl.className = 'bp-bancada-warning';
        warningEl.title = `Atenção: Turmas divergentes nesta bancada (${distinctTurmas.map(t => 'Turma ' + t).join(' + ')}). Em dias de folga de uma das turmas, a bancada ficará desbalanceada.`;
        warningEl.innerHTML = `⚠️ Turmas Dif. (${distinctTurmas.map(t => 'T.' + t).join('+')})`;
        bancadaBox.appendChild(warningEl);
      }

      // Drop Zone for Multiple Operator Cards
      const dropZone = document.createElement('div');
      dropZone.className = 'bp-bancada-ops-drop';
      dropZone.dataset.bancadaId = bancadaId;
      dropZone.dataset.zoneId = 'ilhas';

      dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
      });

      dropZone.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
      });

      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
        if (draggedOpId) {
          moveOperatorToZone(draggedOpId, 'ilhas', bancadaId);
        }
      });

      // Render each operator card inside the bench
      if (benchOps.length === 0) {
        const emptySlot = document.createElement('div');
        emptySlot.className = 'bp-bancada-empty-slot';
        emptySlot.innerHTML = `<span class="bp-slot-plus">+</span><span>B${b} Vazio</span>`;
        emptySlot.addEventListener('click', () => {
          openNewOperatorModalForBancada(bancadaId);
        });
        dropZone.appendChild(emptySlot);
      } else {
        benchOps.forEach((op, idx) => {
          const autoPosCode = op.posCode || `I${String((b - 1) * 2 + Math.min(idx + 1, 2)).padStart(2, '0')}`;
          dropZone.appendChild(createSmallOperatorCardEl(op, autoPosCode));
        });
      }

      // Explicit Add-Target Button & Drop Target for adding more operators
      const addTarget = document.createElement('div');
      addTarget.className = 'bp-bancada-add-target';
      addTarget.innerHTML = `<span>+ Adicionar à B${b}</span>`;
      addTarget.title = `Clique para alocar do pool ou arraste um operador para adicionar à Bancada B${b}`;
      
      addTarget.addEventListener('click', (e) => {
        e.stopPropagation();
        openNewOperatorModalForBancada(bancadaId);
      });

      addTarget.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addTarget.classList.add('drag-over');
      });

      addTarget.addEventListener('dragleave', (e) => {
        e.stopPropagation();
        addTarget.classList.remove('drag-over');
      });

      addTarget.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        addTarget.classList.remove('drag-over');
        if (draggedOpId) {
          moveOperatorToZone(draggedOpId, 'ilhas', bancadaId);
        }
      });

      dropZone.appendChild(addTarget);
      bancadaBox.appendChild(dropZone);
      gridContainer.appendChild(bancadaBox);
    }
  }

  // Helper to open modal for adding an operator directly to a bancada
  function openNewOperatorModalForBancada(bancadaId) {
    const poolOp = operators.find(o => o.zone === 'dock' && o.status === 'PRESENT');
    if (poolOp) {
      poolOp.zone = 'ilhas';
      poolOp.bancadaId = bancadaId;
      saveOperatorsToStorage(operators);
      renderAll();
    } else {
      openOperatorModal(null);
    }
  }

  // --------------------------------------------------------------------------
  // Render Support Panels (Pool, Sinergia, Inativos)
  // --------------------------------------------------------------------------
  function renderSupportPanels(opsByZone) {
    const dropDock = document.getElementById('drop-dock');
    const dropSynergy = document.getElementById('drop-external_synergy');
    const dropInactive = document.getElementById('drop-inactive');

    if (dropDock) {
      dropDock.innerHTML = '';
      if (opsByZone.dock.length === 0) {
        dropDock.innerHTML = `<span style="font-size:0.65rem; color:rgba(255,255,255,0.4); padding:6px;">Nenhum operador sem posto</span>`;
      } else {
        opsByZone.dock.forEach(op => {
          dropDock.appendChild(createSmallOperatorCardEl(op, 'Pool'));
        });
      }
    }

    if (dropSynergy) {
      dropSynergy.innerHTML = '';
      if (opsByZone.external_synergy.length === 0) {
        dropSynergy.innerHTML = `<span style="font-size:0.65rem; color:rgba(255,255,255,0.4); padding:6px;">Nenhum operador em sinergia externa</span>`;
      } else {
        opsByZone.external_synergy.forEach(op => {
          dropSynergy.appendChild(createSmallOperatorCardEl(op, 'Sinergia'));
        });
      }
    }

    if (dropInactive) {
      dropInactive.innerHTML = '';
      if (opsByZone.inactive.length === 0) {
        dropInactive.innerHTML = `<span style="font-size:0.65rem; color:rgba(255,255,255,0.4); padding:6px;">Todos presentes hoje</span>`;
      } else {
        opsByZone.inactive.forEach(op => {
          dropInactive.appendChild(createSmallOperatorCardEl(op, op.status === 'OFF' ? 'Folga' : 'Falta'));
        });
      }
    }
  }

  // --------------------------------------------------------------------------
  // Small Operator Card Component (Replacing SVG Stick Figures)
  // --------------------------------------------------------------------------
  function createSmallOperatorCardEl(op, posCodeBadge = null) {
    const card = document.createElement('div');
    card.className = `bp-card status-${op.status} turma-${op.turma}`;
    card.setAttribute('draggable', 'true');
    card.dataset.opId = op.id;
    card.dataset.posCode = op.posCode || posCodeBadge || '';
    card.dataset.zoneId = op.zone || 'dock';
    card.title = `${op.name} | RE: ${op.re} | Turma ${op.turma} | ${op.role}`;

    const shortName = getShortName(op.name);
    const initials = getInitials(op.name);
    const isLeader = op.role === 'Líder Operacional';
    const leaderMark = isLeader ? '⭐ ' : '';
    const groupRec = getGroupForOperator(op.id, fixedGroups);
    const lockMark = groupRec ? '🔒' : '';
    const posText = posCodeBadge || op.posCode || op.role || 'Operador';

    card.innerHTML = `
      <div class="bp-card-avatar turma-${op.turma}">${initials}</div>
      <div class="bp-card-info">
        <div class="bp-card-name" title="${op.name}">${leaderMark}${shortName} ${lockMark}</div>
        <div class="bp-card-meta">
          <span class="bp-card-pos">${posText}</span>
          <span class="bp-card-turma">T.${op.turma}</span>
        </div>
      </div>
    `;

    // Double click opens edit modal
    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openOperatorModal(op);
    });

    // Drag events
    card.addEventListener('dragstart', (e) => {
      draggedOpId = op.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', op.id);
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.bp-card, .bp-slot-empty, .bp-cards-drop-area').forEach(c => {
        c.classList.remove('drag-target');
        c.classList.remove('slot-drag-over');
        c.classList.remove('drag-over');
      });
      draggedOpId = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (draggedOpId && draggedOpId !== op.id) {
        card.classList.add('drag-target');
      }
    });

    card.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      card.classList.remove('drag-target');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-target');
      if (!draggedOpId || draggedOpId === op.id) return;

      const draggedOp = operators.find(o => o.id === draggedOpId);
      if (op.zone === 'ilhas' && op.bancadaId) {
        if (draggedOp && draggedOp.bancadaId === op.bancadaId) {
          // Already in the same bancada: swap/reorder
          swapOrMoveOperators(draggedOpId, op.id);
        } else {
          // Dragged from Pool, Sinergia or other bench: add to this bancada!
          moveOperatorToZone(draggedOpId, 'ilhas', op.bancadaId);
        }
      } else if (op.zone === 'atrelamento') {
        if (draggedOp && draggedOp.zone === 'atrelamento') {
          swapOrMoveOperators(draggedOpId, op.id);
        } else {
          // Dragged from outside: add to Atrelamento!
          moveOperatorToZone(draggedOpId, 'atrelamento');
        }
      } else {
        swapOrMoveOperators(draggedOpId, op.id);
      }
    });

    return card;
  }

  // --------------------------------------------------------------------------
  // Empty Slot Component (Interactive Drop Target for Position Codes)
  // --------------------------------------------------------------------------
  function createEmptySlotEl(posCode, zoneId, defaultRole = 'Vago', bancadaId = null) {
    const slot = document.createElement('div');
    slot.className = 'bp-slot-empty';
    slot.dataset.posCode = posCode;
    slot.dataset.zoneId = zoneId;
    slot.dataset.role = defaultRole;
    if (bancadaId) slot.dataset.bancadaId = bancadaId;
    slot.title = `Posição ${posCode} (${defaultRole}) livre - Arraste um operador para cá`;

    slot.innerHTML = `
      <span class="bp-slot-plus">+</span>
      <span class="bp-slot-label">${posCode}</span>
      <span class="bp-slot-role">${defaultRole}</span>
    `;

    slot.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.add('slot-drag-over');
    });

    slot.addEventListener('dragleave', (e) => {
      e.stopPropagation();
      slot.classList.remove('slot-drag-over');
    });

    slot.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      slot.classList.remove('slot-drag-over');
      if (draggedOpId) {
        assignOperatorToSlot(draggedOpId, posCode, zoneId, defaultRole, bancadaId);
      }
    });

    return slot;
  }

  // Helper for Initials
  function getInitials(name) {
    if (!name) return 'OP';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  // Helper for Short Name
  function getShortName(name) {
    if (!name) return 'Operador';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  // Assign Operator directly to a position code and zone
  function assignOperatorToSlot(opId, posCode, zoneId, role, bancadaId = null) {
    const op = operators.find(o => o.id === opId);
    if (!op) return;

    // Clear position code from any other operator who had it
    operators.forEach(otherOp => {
      if (otherOp.id !== opId && otherOp.posCode === posCode) {
        otherOp.posCode = null;
        otherOp.zone = 'dock';
      }
    });

    op.posCode = posCode;
    op.zone = zoneId;
    op.status = 'PRESENT';
    op.lastWorkingZone = zoneId;
    if (bancadaId) op.bancadaId = bancadaId;
    if (role && role !== 'Vago') op.role = role;

    saveOperatorsToStorage(operators);
    renderAll();
  }

  // Swap position of two operators
  function swapOrMoveOperators(sourceId, targetOpId) {
    if (!sourceId || !targetOpId || sourceId === targetOpId) return;

    const sourceOp = operators.find(o => o.id === sourceId);
    const targetOp = operators.find(o => o.id === targetOpId);
    if (!sourceOp || !targetOp) return;

    // Swap position codes and zones
    const tempZone = sourceOp.zone;
    const tempPosCode = sourceOp.posCode;
    const tempBancadaId = sourceOp.bancadaId;
    const tempStatus = sourceOp.status;

    sourceOp.zone = targetOp.zone;
    sourceOp.posCode = targetOp.posCode;
    sourceOp.bancadaId = targetOp.bancadaId;
    sourceOp.status = (targetOp.zone === 'inactive') ? 'OFF' : (targetOp.zone === 'external_synergy') ? 'SYNERGY_EXT' : 'PRESENT';
    if (sourceOp.status === 'PRESENT') sourceOp.lastWorkingZone = sourceOp.zone;

    targetOp.zone = tempZone;
    targetOp.posCode = tempPosCode;
    targetOp.bancadaId = tempBancadaId;
    targetOp.status = (tempZone === 'inactive') ? 'OFF' : (tempZone === 'external_synergy') ? 'SYNERGY_EXT' : 'PRESENT';
    if (targetOp.status === 'PRESENT') targetOp.lastWorkingZone = targetOp.zone;

    saveOperatorsToStorage(operators);
    renderAll();
  }

  // Move operator to a general zone (Pool, Sinergia, Folga, Ilhas, Atrelamento)
  function moveOperatorToZone(opId, targetZoneId, targetBancadaId = null, targetPosCode = null) {
    const op = operators.find(o => o.id === opId);
    if (!op) return;

    op.zone = targetZoneId;
    op.bancadaId = targetBancadaId || null;

    if (targetZoneId === 'atrelamento') {
      if (targetPosCode) {
        op.posCode = targetPosCode;
      } else {
        const atrelOps = operators.filter(o => o.zone === 'atrelamento' && o.id !== opId && o.status === 'PRESENT');
        const usedCodes = new Set(atrelOps.map(o => o.posCode));
        const allCandidates = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08'];
        op.posCode = allCandidates.find(c => !usedCodes.has(c)) || `A0${atrelOps.length + 1}`;
      }
      op.role = 'REP 1';
      op.lastPosCode = op.posCode;
      op.lastWorkingZone = 'atrelamento';
    } else if (targetZoneId === 'ilhas') {
      if (!targetBancadaId && op.lastBancadaId) op.bancadaId = op.lastBancadaId;
    } else {
      op.posCode = targetPosCode || null;
    }

    if (targetZoneId === 'inactive') {
      op.status = 'OFF';
    } else if (targetZoneId === 'external_synergy') {
      op.status = 'SYNERGY_EXT';
    } else {
      op.status = 'PRESENT';
      op.lastWorkingZone = targetZoneId;
    }

    // If operator belongs to a fixed group and is moved to a bancada, move partners too
    if (targetZoneId === 'ilhas' && targetBancadaId) {
      const groupRec = getGroupForOperator(op.id, fixedGroups);
      if (groupRec) {
        groupRec.opIds.forEach(id => {
          if (id !== op.id) {
            const partnerOp = operators.find(o => o.id === id);
            if (partnerOp && partnerOp.status === 'PRESENT') {
              partnerOp.zone = 'ilhas';
              partnerOp.lastWorkingZone = 'ilhas';
              partnerOp.bancadaId = targetBancadaId;
            }
          }
        });
      }
    }

    saveOperatorsToStorage(operators);
    renderAll();
  }

  // --------------------------------------------------------------------------
  // Drag and Drop Setup for Support Panels and General Zones
  // --------------------------------------------------------------------------
  function setupDragAndDrop() {
    const dropPanels = document.querySelectorAll('.bp-panel, .bp-cards-drop-area, .bp-mesa-box');

    dropPanels.forEach(panel => {
      const zoneId = panel.dataset.zoneId || panel.closest('[data-zone-id]')?.dataset.zoneId;
      if (!zoneId) return;

      panel.addEventListener('dragover', (e) => {
        e.preventDefault();
        panel.classList.add('drag-over');
      });

      panel.addEventListener('dragleave', (e) => {
        if (!panel.contains(e.relatedTarget)) {
          panel.classList.remove('drag-over');
        }
      });

      panel.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        panel.classList.remove('drag-over');
        if (!draggedOpId) return;

        moveOperatorToZone(draggedOpId, zoneId);
      });
    });
  }

  // --------------------------------------------------------------------------
  // Render Tab 2: Full Scale Matrix Table
  // --------------------------------------------------------------------------
  function renderTable() {
    const tableBody = document.getElementById('operatorsTableBody');
    if (!tableBody) return;

    const filteredOps = getFilteredOperators();
    tableBody.innerHTML = '';

    if (filteredOps.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">Nenhum operador encontrado com os filtros aplicados.</td></tr>`;
      return;
    }

    filteredOps.forEach(op => {
      const tr = document.createElement('tr');

      let statusBadge = `<span class="badge badge-present"><i data-lucide="check-circle"></i> Presente</span>`;
      if (op.status === 'OFF') {
        statusBadge = `<span class="badge badge-off"><i data-lucide="calendar-off"></i> Folga Escala</span>`;
      } else if (op.status === 'ABSENT') {
        statusBadge = `<span class="badge badge-absent"><i data-lucide="x-circle"></i> Falta</span>`;
      } else if (op.status === 'SYNERGY_EXT') {
        statusBadge = `<span class="badge badge-synergy"><i data-lucide="arrow-up-right"></i> Sinergia Externa</span>`;
      }

      const zoneName = REWORK_ZONES[op.zone]?.name || op.zone;
      const isLeader = op.role === 'Líder Operacional';
      const leaderStar = isLeader ? '⭐ ' : '';
      const posBadgeHtml = op.posCode ? `<span class="pos-code-badge" style="font-size:0.65rem; padding:0.05rem 0.35rem; margin-right:0.3rem;">${op.posCode}</span>` : '';
      const groupRecord = getGroupForOperator(op.id, fixedGroups);
      const fixedIconHtml = groupRecord ? `<span title="Bancada Fixada 🔒" style="color:#d8b4fe; font-size:0.75rem;">🔒 Bancada Fixa</span>` : '';

      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary); display:block;">${posBadgeHtml}${leaderStar}${op.name} ${fixedIconHtml}</strong>
          <span style="font-size:0.7rem; color:var(--text-muted);">RE: ${op.re}</span>
        </td>
        <td><span class="badge-sector">Turma ${op.turma}</span></td>
        <td><span class="badge-jantar"><i data-lucide="utensils" style="width:12px; height:12px;"></i> ${op.jantar || '18:30'}</span></td>
        <td>${op.role}</td>
        <td><span class="badge-zone">${zoneName}</span></td>
        <td>${statusBadge}</td>
        <td>
          <button class="btn btn-ghost btn-sm btn-edit-row" title="Editar Operador">
            <i data-lucide="edit-3" style="width:14px; height:14px;"></i>
          </button>
        </td>
      `;

      tr.querySelector('.btn-edit-row')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openOperatorModal(op);
      });

      tr.addEventListener('dblclick', () => openOperatorModal(op));
      tableBody.appendChild(tr);
    });
  }

  // --------------------------------------------------------------------------
  // Operator Modal Form (Create / Edit)
  // --------------------------------------------------------------------------
  const modalOperator = document.getElementById('modalOperator');
  const btnNewOperator = document.getElementById('btnNewOperator');
  const modalClose = document.querySelector('[data-close="modalOperator"]');
  const btnCancelOp = document.getElementById('btnCancelOp');
  const formOperator = document.getElementById('formOperator');

  if (btnNewOperator) {
    btnNewOperator.addEventListener('click', () => openOperatorModal(null));
  }

  if (modalClose) {
    modalClose.addEventListener('click', () => modalOperator.classList.remove('active'));
  }

  if (btnCancelOp) {
    btnCancelOp.addEventListener('click', () => modalOperator.classList.remove('active'));
  }

  function openOperatorModal(op = null) {
    const modalTitle = document.getElementById('modalOperatorTitle') || document.getElementById('modalTitle');
    const opIdInput = document.getElementById('opId');

    if (op) {
      if (modalTitle) modalTitle.textContent = 'Editar Operador';
      opIdInput.value = op.id;
      document.getElementById('opName').value = op.name;
      document.getElementById('opRE').value = op.re;
      document.getElementById('opTurma').value = op.turma || 'AA';
      document.getElementById('opJantar').value = op.jantar || '18:30';
      document.getElementById('opRole').value = op.role;
      document.getElementById('opZone').value = op.zone;
      document.getElementById('opStatus').value = op.status;
    } else {
      if (modalTitle) modalTitle.textContent = 'Novo Operador';
      formOperator.reset();
      opIdInput.value = '';
      document.getElementById('opTurma').value = 'AA';
      document.getElementById('opJantar').value = '18:30';
    }

    modalOperator.classList.add('active');
  }

  if (formOperator) {
    formOperator.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('opId').value;
      const name = document.getElementById('opName').value.trim();
      const re = document.getElementById('opRE').value.trim();
      const turma = document.getElementById('opTurma').value;
      const jantar = document.getElementById('opJantar').value;
      const role = document.getElementById('opRole').value;
      const zone = document.getElementById('opZone').value;
      const status = document.getElementById('opStatus').value;
      const avatar = Math.floor(Math.random() * 4) + 1;

      if (id) {
        const op = operators.find(o => o.id === id);
        if (op) {
          op.name = name;
          op.re = re;
          op.turma = turma;
          op.jantar = jantar;
          op.role = role;
          
          if (status === 'OFF' || status === 'ABSENT' || zone === 'inactive') {
            if (op.zone !== 'inactive') {
              op.lastWorkingZone = op.zone;
              if (op.bancadaId) op.lastBancadaId = op.bancadaId;
              if (op.posCode) op.lastPosCode = op.posCode;
            }
            op.status = (status === 'PRESENT') ? 'OFF' : status;
            op.zone = 'inactive';
            op.bancadaId = null;
            op.posCode = null;
          } else {
            op.status = status;
            if (zone === 'inactive') {
              // Returned to present: restore position/bench
              op.zone = op.lastWorkingZone || (op.lastBancadaId ? 'ilhas' : 'dock');
              op.bancadaId = op.lastBancadaId || null;
              op.posCode = op.lastPosCode || null;
            } else {
              op.zone = zone;
              if (zone !== 'inactive' && zone !== 'external_synergy') op.lastWorkingZone = zone;
            }
          }
          op.avatar = avatar;
        }
      } else {
        const newOp = {
          id: `op-${Date.now()}`,
          name,
          re,
          turma,
          jantar,
          role,
          shift: 'Turno 2 (14h-23h)',
          zone,
          lastWorkingZone: (zone !== 'inactive') ? zone : 'dock',
          status,
          avatar
        };
        operators.push(newOp);
      }

      saveOperatorsToStorage(operators);
      modalOperator.classList.remove('active');
      renderAll();
    });
  }

  // Tab Navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      activeTab = btn.dataset.tab;
      const targetContent = document.getElementById(activeTab);
      if (targetContent) targetContent.classList.add('active');

      renderAll();
    });
  });

  // Status Filter Pills
  document.querySelectorAll('#statusFilterPills .filter-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('#statusFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeStatusFilter = pill.dataset.status;
      renderAll();
    });
  });

  // Turma Selector
  const turmaSelect = document.getElementById('turmaSelect');
  if (turmaSelect) {
    turmaSelect.addEventListener('change', (e) => {
      activeTurma = e.target.value;
      renderAll();
    });
  }

  // Clear Filters Button in Table View
  const btnFilterAll = document.getElementById('btnFilterAll');
  if (btnFilterAll) {
    btnFilterAll.addEventListener('click', () => {
      activeTurma = 'ALL';
      activeStatusFilter = 'ALL';
      searchQuery = '';
      if (turmaSelect) turmaSelect.value = 'ALL';
      if (searchInput) searchInput.value = '';
      document.querySelectorAll('#statusFilterPills .filter-pill').forEach(p => p.classList.remove('active'));
      document.querySelector('#statusFilterPills .filter-pill[data-status="ALL"]')?.classList.add('active');
      renderAll();
    });
  }

  // Search Input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderAll();
    });
  }

  // Export CSV Action
  const btnExport = document.getElementById('btnExport');
  if (btnExport) {
    btnExport.addEventListener('click', () => {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Codigo_Posicao;Nome;RE;Turma;Horario_Janta;Cargo;Setor_Rework;Status\n";

      operators.forEach(op => {
        const posCode = op.posCode || 'SEM_CODIGO';
        const zoneName = REWORK_ZONES[op.zone]?.name || op.zone;
        csvContent += `"${posCode}";"${op.name}";"${op.re}";"${op.turma}";"${op.jantar}";"${op.role}";"${zoneName}";"${op.status}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Mapa_Ocupacao_REWORK_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  }

  // Reset Data Action
  const btnResetData = document.getElementById('btnResetData');
  if (btnResetData) {
    btnResetData.addEventListener('click', () => {
      if (confirm('Deseja recarregar a escala oficial do REWORK?')) {
        const selectedDate = document.getElementById('dateSelect')?.value || '2026-08-10';
        operators = resetToDefaultData(selectedDate);
        renderAll();
      }
    });
  }

  // Boot Application
  renderAll();
});
