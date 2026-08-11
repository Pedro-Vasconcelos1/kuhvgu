/* ==========================================================================
   OpSinergia REWORK - Main Application Controller (Padlock Toggle & Flexible Fixed Groups)
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

  // Date Change Handler: Preserves Last Working Zone & Restores Fixed Groups
  function onDateChange(selectedDate) {
    const folgaTurma = ESCALA_FOLGAS_AGOSTO_2026[selectedDate];
    if (folgaTurma) {
      operators.forEach(op => {
        if (op.turma === folgaTurma) {
          // Save active post before entering Folga
          if (op.zone !== 'inactive') {
            op.lastWorkingZone = op.zone;
          }
          op.status = 'OFF';
          op.zone = 'inactive';
        } else {
          if (op.status === 'OFF') {
            op.status = 'PRESENT';
            // Restore exact last working post (Buffer, Atrelamento, Ilhas, etc.)
            op.zone = op.lastWorkingZone || 'dock';
          }
        }
      });

      // Restore Fixed Groups back together in Ilhas if any member returns to work
      fixedGroups = loadFixedGroupsFromStorage();
      fixedGroups.forEach(g => {
        const groupOps = operators.filter(o => g.opIds.includes(o.id));
        const activeGroupOps = groupOps.filter(o => o.status === 'PRESENT');
        if (activeGroupOps.length > 0) {
          const anyInIlhas = activeGroupOps.some(o => o.lastWorkingZone === 'ilhas');
          if (anyInIlhas) {
            activeGroupOps.forEach(o => {
              o.zone = 'ilhas';
              o.lastWorkingZone = 'ilhas';
            });
          }
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

      // Build options
      let html = '';
      DEFAULT_OPS_SUPERVISORS.forEach(sup => {
        const selectedStr = (sup === currentAssigned) ? 'selected' : '';
        html += `<option value="${sup}" ${selectedStr}>${sup}</option>`;
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
        if (!matchName && !matchRE && !matchRole && !matchTurma) return false;
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
    const presentOps = currentOps.filter(op => op.status === 'PRESENT');
    const externalSynergyOps = currentOps.filter(op => op.status === 'SYNERGY_EXT');
    const offOps = currentOps.filter(op => op.status === 'OFF');
    const absentOps = currentOps.filter(op => op.status === 'ABSENT');

    // Dinner counters for working operators
    const workingOps = currentOps.filter(op => op.status === 'PRESENT' || op.status === 'SYNERGY_EXT');
    const jantar18Count = workingOps.filter(op => op.jantar === '18:30').length;
    const jantar19Count = workingOps.filter(op => op.jantar === '19:30').length;

    document.getElementById('kpiTotalScaled').textContent = totalScaled;
    document.getElementById('kpiPresent').textContent = presentOps.length;
    document.getElementById('kpiExternalSynergy').textContent = externalSynergyOps.length;
    document.getElementById('kpiOffAbsent').textContent = offOps.length + absentOps.length;
    document.getElementById('kpiOffAbsentSub').textContent = `${offOps.length} Folgas | ${absentOps.length} Faltas`;
    
    document.getElementById('kpiJantar18').textContent = jantar18Count;
    document.getElementById('kpiJantar19').textContent = jantar19Count;
  }

  // --------------------------------------------------------------------------
  // Render Tab 1: 2D Spatial Floor Plan
  // --------------------------------------------------------------------------
  function renderFloorPlan() {
    const filteredOps = getFilteredOperators();

    const zoneContainers = {
      buffer_guardioes: document.getElementById('drop-buffer_guardioes'),
      buffer_saida: document.getElementById('drop-buffer_saida'),
      ilhas: document.getElementById('drop-ilhas'),
      oportunidades: document.getElementById('drop-oportunidades'),
      atrelamento: document.getElementById('drop-atrelamento'),
      fechamento_aut: document.getElementById('drop-fechamento_aut'),
      fechamento_cpt: document.getElementById('drop-fechamento_cpt'),
      dock: document.getElementById('drop-dock'),
      external_synergy: document.getElementById('drop-external_synergy'),
      inactive: document.getElementById('drop-inactive')
    };

    // Clear containers
    Object.keys(zoneContainers).forEach(zId => {
      if (zoneContainers[zId]) zoneContainers[zId].innerHTML = '';
    });

    const zoneCounts = {
      buffer_guardioes: 0, buffer_saida: 0, buffer_total: 0,
      ilhas: 0, oportunidades: 0, atrelamento: 0,
      fechamento_aut: 0, fechamento_cpt: 0, dock: 0, external_synergy: 0, inactive: 0
    };

    // Array to collect Ilhas operators
    const ilhasOperators = [];

    filteredOps.forEach(op => {
      let zId = op.zone || 'dock';

      // Fallback for legacy buffer zone string
      if (zId === 'buffer') zId = 'buffer_guardioes';

      if (zId === 'buffer_guardioes' || zId === 'buffer_saida') {
        zoneCounts[zId]++;
        zoneCounts.buffer_total++;
        if (zoneContainers[zId]) {
          const cardEl = createOperatorCardEl(op);
          zoneContainers[zId].appendChild(cardEl);
        }
      } else if (zId === 'ilhas') {
        zoneCounts.ilhas++;
        ilhasOperators.push(op);
      } else {
        if (zoneCounts[zId] !== undefined) {
          zoneCounts[zId]++;
        }
        if (zoneContainers[zId]) {
          const cardEl = createOperatorCardEl(op);
          zoneContainers[zId].appendChild(cardEl);
        }
      }
    });

    // Render Ilhas with Padlock Toggle & Flexible Group Sizes
    renderIlhasBancadas(ilhasOperators, zoneContainers.ilhas);

    // Update Counter Badges
    document.getElementById('count-buffer').textContent = zoneCounts.buffer_total;
    if (document.getElementById('count-buffer_guardioes')) {
      document.getElementById('count-buffer_guardioes').textContent = zoneCounts.buffer_guardioes;
    }
    if (document.getElementById('count-buffer_saida')) {
      document.getElementById('count-buffer_saida').textContent = zoneCounts.buffer_saida;
    }

    const simpleZones = ['ilhas', 'oportunidades', 'atrelamento', 'fechamento_aut', 'fechamento_cpt', 'dock', 'external_synergy', 'inactive'];
    simpleZones.forEach(zId => {
      const el = document.getElementById(`count-${zId}`);
      if (el) {
        el.textContent = zoneCounts[zId];
      }
    });

    setupDragAndDrop();
  }

  // Render Ilhas Bancadas with Padlock Toggle 🔒 / 🔓 and Flexible Group Sizes (2, 3, 4+ ops)
  function renderIlhasBancadas(opsList, containerEl) {
    if (!containerEl) return;
    containerEl.innerHTML = '';

    if (opsList.length === 0) {
      containerEl.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:1.5rem; color:var(--text-muted); font-size:0.75rem; border:1px dashed rgba(255,255,255,0.1); border-radius:6px;">Nenhum operador alocado nas Ilhas</div>`;
      return;
    }

    // Group operators into Bancadas (by Fixed Group if locked, or by 2s/3s)
    const bancadas = [];
    const processedOpIds = new Set();

    // 1. Process active Fixed Groups first
    fixedGroups.forEach(group => {
      const groupOps = opsList.filter(o => group.opIds.includes(o.id));
      if (groupOps.length > 0) {
        bancadas.push({
          isFixedGroup: true,
          groupId: group.id,
          ops: groupOps
        });
        groupOps.forEach(o => processedOpIds.add(o.id));
      }
    });

    // 2. Group remaining unlinked operators into bancadas of 2
    const unlinkedOps = opsList.filter(o => !processedOpIds.has(o.id));
    for (let i = 0; i < unlinkedOps.length; i += 2) {
      const pair = unlinkedOps.slice(i, i + 2);
      bancadas.push({
        isFixedGroup: false,
        groupId: null,
        ops: pair
      });
    }

    // Render each Bancada Box
    bancadas.forEach((bancada, idx) => {
      const bancadaIndex = idx + 1;
      const pairBox = document.createElement('div');
      pairBox.className = 'ilha-pair-box';
      pairBox.dataset.zoneId = 'ilhas';
      pairBox.dataset.bancadaIdx = bancadaIndex;

      if (bancada.isFixedGroup) {
        pairBox.classList.add('is-fixed');
      }

      let statusBadgeHtml = '';
      let lockButtonHtml = '';

      if (bancada.isFixedGroup) {
        statusBadgeHtml = `<span class="badge-group-locked"><i data-lucide="lock"></i> Fixado (${bancada.ops.length})</span>`;
        lockButtonHtml = `
          <button class="btn-lock-toggle locked" title="Bancada Fixada 🔒 (Clique para abrir/desvincular)" data-action="unlink" data-opids='${JSON.stringify(bancada.ops.map(o => o.id))}'>
            <i data-lucide="lock"></i>
          </button>
        `;
      } else {
        const opIdsJson = JSON.stringify(bancada.ops.map(o => o.id));
        lockButtonHtml = `
          <button class="btn-lock-toggle unlocked" title="Trancar Bancada 🔓 (Fixar estes colaboradores juntos)" data-action="link" data-opids='${opIdsJson}'>
            <i data-lucide="unlock"></i>
          </button>
        `;

        if (bancada.ops.length >= 2) {
          const firstTurma = bancada.ops[0].turma;
          const allSameTurma = bancada.ops.every(o => o.turma === firstTurma);
          if (allSameTurma) {
            pairBox.classList.add('pair-valid');
            statusBadgeHtml = `<span class="pair-status-match">✓ Turma ${firstTurma}</span>`;
          } else {
            pairBox.classList.add('pair-mismatch');
            const turmasStr = bancada.ops.map(o => o.turma).join(' / ');
            statusBadgeHtml = `<span class="pair-status-mismatch" title="Atenção: Turmas diferentes!">⚠️ Turmas (${turmasStr})</span>`;
          }
        } else if (bancada.ops.length === 1) {
          pairBox.classList.add('pair-valid');
          statusBadgeHtml = `<span class="pair-status-match" style="opacity:0.75;">T. ${bancada.ops[0].turma}</span>`;
        }
      }

      pairBox.innerHTML = `
        <div class="ilha-pair-header">
          <span class="pair-title">Bancada ${bancadaIndex}</span>
          <div style="display:flex; align-items:center; gap:0.35rem;">
            ${statusBadgeHtml}
            ${lockButtonHtml}
          </div>
        </div>
        <div class="pair-cards-container" style="display:flex; flex-direction:column; gap:0.3rem;"></div>
      `;

      // Event Listener for Padlock Toggle Button 🔒 / 🔓
      const btnLock = pairBox.querySelector('.btn-lock-toggle');
      if (btnLock) {
        btnLock.addEventListener('click', (e) => {
          e.stopPropagation();
          const action = btnLock.dataset.action;
          const targetOpIds = JSON.parse(btnLock.dataset.opids || '[]');

          if (action === 'link' && targetOpIds.length > 0) {
            linkGroupInStorage(targetOpIds);
          } else if (action === 'unlink' && targetOpIds.length > 0) {
            unlinkGroupInStorage(targetOpIds[0]);
          }
          renderAll();
        });
      }

      const cardsContainer = pairBox.querySelector('.pair-cards-container');
      bancada.ops.forEach(op => {
        cardsContainer.appendChild(createOperatorCardEl(op));
      });

      containerEl.appendChild(pairBox);
    });
  }

  // --------------------------------------------------------------------------
  // Operator Card Component Generator
  // --------------------------------------------------------------------------
  function createOperatorCardEl(op) {
    const card = document.createElement('div');
    card.className = `op-card status-${op.status}`;
    card.setAttribute('draggable', 'true');
    card.dataset.opId = op.id;

    const jantarClass = op.jantar === '19:30' ? 'jantar-19' : '';
    const shortName = getShortName(op.name);

    let synergyBadgeHtml = '';
    if (op.status === 'SYNERGY_EXT') {
      synergyBadgeHtml = `<div class="op-synergy-badge synergy-ext" style="margin-top:0.2rem; font-size:0.62rem;"><i data-lucide="arrow-up-right"></i> Sinergia Externa</div>`;
    }

    const isLeader = op.role === 'Líder Operacional';
    const leaderStar = isLeader ? '⭐ ' : '';

    // Fixed Group indicator badge on card if locked
    const groupRecord = getGroupForOperator(op.id, fixedGroups);
    const fixedIconHtml = groupRecord ? `<span title="Pertence a uma Bancada Fixa 🔒" style="color:#d8b4fe; font-size:0.65rem;">🔒</span>` : '';

    card.innerHTML = `
      <span class="op-status-dot"></span>
      <div class="op-card-name">${leaderStar}${shortName} ${fixedIconHtml}</div>
      <div class="op-card-footer">
        <span class="op-turma-badge">T. ${op.turma}</span>
        <span class="op-jantar-badge ${jantarClass}"><i data-lucide="utensils"></i> ${op.jantar || '18:30'}</span>
      </div>
      ${synergyBadgeHtml}
    `;

    // Double click to edit
    card.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      openOperatorModal(op);
    });

    // Drag events (Card Drag & Drop Swapping)
    card.addEventListener('dragstart', (e) => {
      draggedOpId = op.id;
      card.classList.add('dragging');
      e.dataTransfer.setData('text/plain', op.id);
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.op-card').forEach(c => c.classList.remove('drag-target'));
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
      e.preventDefault();
      card.classList.remove('drag-target');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-target');
      if (draggedOpId && draggedOpId !== op.id) {
        swapOrMoveOperators(draggedOpId, op.id);
      }
    });

    return card;
  }

  function getShortName(name) {
    if (!name) return 'Operador';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }

  // Swap position of two operators or move to target operator's spot/zone
  function swapOrMoveOperators(sourceId, targetOpId) {
    if (!sourceId || !targetOpId || sourceId === targetOpId) return;

    const sourceOp = operators.find(o => o.id === sourceId);
    const targetOp = operators.find(o => o.id === targetOpId);
    if (!sourceOp || !targetOp) return;

    // Save working zones
    sourceOp.zone = targetOp.zone;
    if (targetOp.zone !== 'inactive' && targetOp.zone !== 'external_synergy') {
      sourceOp.lastWorkingZone = targetOp.zone;
      sourceOp.status = 'PRESENT';
    } else if (targetOp.zone === 'inactive') {
      sourceOp.status = 'OFF';
    } else if (targetOp.zone === 'external_synergy') {
      sourceOp.status = 'SYNERGY_EXT';
    }

    // Swap positions in the main operators array
    const sourceIdx = operators.indexOf(sourceOp);
    const targetIdx = operators.indexOf(targetOp);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      operators[sourceIdx] = targetOp;
      operators[targetIdx] = sourceOp;
    }

    saveOperatorsToStorage(operators);
    renderAll();
  }

  // Move operator to a zone or pair
  function moveOperatorToZone(opId, targetZoneId) {
    const op = operators.find(o => o.id === opId);
    if (!op) return;

    op.zone = targetZoneId;

    if (targetZoneId === 'inactive') {
      op.status = 'OFF';
    } else if (targetZoneId === 'external_synergy') {
      op.status = 'SYNERGY_EXT';
    } else {
      op.status = 'PRESENT';
      op.lastWorkingZone = targetZoneId; // Save active post!
    }

    // If operator has a Fixed Group, and moving to Ilhas, move group partners too!
    if (targetZoneId === 'ilhas') {
      const groupRec = getGroupForOperator(op.id, fixedGroups);
      if (groupRec) {
        groupRec.opIds.forEach(id => {
          const partnerOp = operators.find(o => o.id === id);
          if (partnerOp && partnerOp.status === 'PRESENT') {
            partnerOp.zone = 'ilhas';
            partnerOp.lastWorkingZone = 'ilhas';
          }
        });
      }
    }

    // Move op to end of array so it appears at the end of that zone
    const idx = operators.indexOf(op);
    if (idx !== -1) {
      operators.splice(idx, 1);
      operators.push(op);
    }

    saveOperatorsToStorage(operators);
    renderAll();
  }

  // --------------------------------------------------------------------------
  // Drag and Drop Engine Setup
  // --------------------------------------------------------------------------
  function setupDragAndDrop() {
    const dropZones = document.querySelectorAll('.zone-card, .buffer-sub-box, .ilha-pair-box, .panel-box');

    dropZones.forEach(zone => {
      const zoneId = zone.dataset.zoneId || (zone.classList.contains('zone-buffer') ? 'buffer_guardioes' : null);
      if (!zoneId) return;

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        zone.classList.remove('drag-over');
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
      const groupRecord = getGroupForOperator(op.id, fixedGroups);
      const fixedIconHtml = groupRecord ? `<span title="Bancada Fixada 🔒" style="color:#d8b4fe; font-size:0.75rem;">🔒 Bancada Fixa</span>` : '';

      tr.innerHTML = `
        <td>
          <strong style="color:var(--text-primary); display:block;">${leaderStar}${op.name} ${fixedIconHtml}</strong>
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
          op.zone = zone;
          if (zone !== 'inactive' && zone !== 'external_synergy') op.lastWorkingZone = zone;
          op.status = status;
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
      csvContent += "Nome;RE;Turma;Horario_Janta;Cargo;Setor_Rework;Status\n";

      operators.forEach(op => {
        const zoneName = REWORK_ZONES[op.zone]?.name || op.zone;
        csvContent += `"${op.name}";"${op.re}";"${op.turma}";"${op.jantar}";"${op.role}";"${zoneName}";"${op.status}"\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Escala_REWORK_Turno2_${new Date().toISOString().split('T')[0]}.csv`);
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
