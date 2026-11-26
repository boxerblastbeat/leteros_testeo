export const PART_COLORS = [
  '#dc2626',
  '#2563eb',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#0891b2',
  '#db2777',
  '#4f46e5',
];

export const PRESET_SHEETS = [
  { id: 'acm', label: 'ACM / Acrílico / Trovicel (2440 × 1220 mm)', w: 2440, h: 1220 },
  { id: 'lata', label: 'Lata Galvanizada (3000 × 1000 mm)', w: 3000, h: 1000 },
  { id: 'custom', label: 'Plancha Personalizada', w: 2000, h: 1000 },
];

// Algoritmo Guillotine / Shelf 2D con soporte de rotación 90° y sangría de disco (kerf)
export function packParts2D(sheetW, sheetH, kerf, allowRotate, partsList) {
  const expanded = [];
  (partsList || []).forEach((p, idx) => {
    const qty = Math.max(1, parseInt(p.qty, 10) || 1);
    const w = Math.max(1, Math.round(parseFloat(p.w) || 0));
    const h = Math.max(1, Math.round(parseFloat(p.h) || 0));
    for (let i = 0; i < qty; i++) {
      expanded.push({
        uid: `${p.id || idx}-${i}`,
        label: p.label || `Pieza ${idx + 1}`,
        w,
        h,
        color: PART_COLORS[idx % PART_COLORS.length],
      });
    }
  });

  expanded.sort((a, b) => Math.max(b.w, b.h) - Math.max(a.w, a.h) || b.w * b.h - a.w * a.h);

  const sheets = [];
  const unplaced = [];

  const createSheet = () => ({
    id: sheets.length + 1,
    placed: [],
    freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
  });

  const tryPlaceOnSheet = (sheet, part) => {
    let bestRectIdx = -1;
    let bestOrientation = null;
    let bestScore = Infinity;

    for (let i = 0; i < sheet.freeRects.length; i++) {
      const r = sheet.freeRects[i];
      const candidates = [{ w: part.w, h: part.h, rotated: false }];
      if (allowRotate && part.w !== part.h) {
        candidates.push({ w: part.h, h: part.w, rotated: true });
      }

      for (const c of candidates) {
        if (c.w <= r.w && c.h <= r.h) {
          const score = Math.min(r.w - c.w, r.h - c.h);
          if (score < bestScore) {
            bestScore = score;
            bestRectIdx = i;
            bestOrientation = c;
          }
        }
      }
    }

    if (bestRectIdx === -1) return false;

    const r = sheet.freeRects[bestRectIdx];
    const placed = {
      ...part,
      x: r.x,
      y: r.y,
      w: bestOrientation.w,
      h: bestOrientation.h,
      rotated: bestOrientation.rotated,
    };
    sheet.placed.push(placed);

    sheet.freeRects.splice(bestRectIdx, 1);
    const rightW = r.w - placed.w - kerf;
    const bottomH = r.h - placed.h - kerf;

    if (rightW > 0 && bottomH > 0) {
      if (rightW > bottomH) {
        sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: r.h });
        sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: placed.w, h: bottomH });
      } else {
        sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: r.w, h: bottomH });
        sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: placed.h });
      }
    } else if (rightW > 0) {
      sheet.freeRects.push({ x: r.x + placed.w + kerf, y: r.y, w: rightW, h: r.h });
    } else if (bottomH > 0) {
      sheet.freeRects.push({ x: r.x, y: r.y + placed.h + kerf, w: r.w, h: bottomH });
    }

    return true;
  };

  for (const part of expanded) {
    const fitsAtAll =
      (part.w <= sheetW && part.h <= sheetH) ||
      (allowRotate && part.h <= sheetW && part.w <= sheetH);
    if (!fitsAtAll) {
      unplaced.push(part);
      continue;
    }

    let ok = false;
    for (const s of sheets) {
      if (tryPlaceOnSheet(s, part)) {
        ok = true;
        break;
      }
    }
    if (!ok) {
      const nextSheet = createSheet();
      sheets.push(nextSheet);
      tryPlaceOnSheet(nextSheet, part);
    }
  }

  const sheetArea = sheetW * sheetH;
  const totalUsedArea = sheets.reduce(
    (sum, s) => sum + s.placed.reduce((a, p) => a + p.w * p.h, 0),
    0
  );
  const totalAvailable = sheets.length * sheetArea;
  const efficiency = totalAvailable > 0 ? (totalUsedArea / totalAvailable) * 100 : 0;

  return { sheets, unplaced, efficiency, totalUsedArea };
}

// Agrupa planchas con el mismo patrón de cortes para generar una glosa compacta y clara para taller
export function summarizeSheetPatterns(sheets, sheetW, sheetH) {
  const groups = [];
  const bySig = new Map();

  sheets.forEach((sheet) => {
    const counts = {};
    sheet.placed.forEach((p) => {
      const key = `${p.label}|${p.w}x${p.h}`;
      counts[key] = (counts[key] || 0) + 1;
    });
    const sig = Object.keys(counts)
      .sort()
      .map((k) => `${k}:${counts[k]}`)
      .join(';');

    const used = sheet.placed.reduce((s, p) => s + p.w * p.h, 0);
    const pct = sheetW * sheetH > 0 ? (used / (sheetW * sheetH)) * 100 : 0;

    if (bySig.has(sig)) {
      bySig.get(sig).sheetIds.push(sheet.id);
    } else {
      const summaryItems = Object.entries(counts).map(([k, qty]) => {
        const [label, dims] = k.split('|');
        return { label, dims, qty };
      });
      const entry = {
        sig,
        sheetIds: [sheet.id],
        sampleSheet: sheet,
        efficiency: pct,
        summaryItems,
      };
      bySig.set(sig, entry);
      groups.push(entry);
    }
  });

  return groups;
}

const detectMaterialSpec = (itemName = '', detail = '') => {
  const text = `${itemName} ${detail}`.toLowerCase();

  if (text.includes('lata') || text.includes('galvanizad')) {
    return { kind: 'rigid', key: 'lata', label: itemName || 'Lata Galvanizada', sheetW: 3000, sheetH: 1000 };
  }
  if (
    text.includes('acrílico') ||
    text.includes('acrilico') ||
    text.includes('acm') ||
    text.includes('aluminio compuesto') ||
    text.includes('trovicel') ||
    text.includes('pvc espumado') ||
    text.includes('foam') ||
    text.includes('sintra') ||
    text.includes('placa')
  ) {
    return { kind: 'rigid', key: itemName.toLowerCase(), label: itemName, sheetW: 2440, sheetH: 1220 };
  }

  // Rollo flexible (Tela PVC, Vinilo, Adhesivo, Laminado, Empavonado, Microperforado, Imantado)
  const widthMatch = text.match(/(\d+\.\d{2,3})\s*m/);
  const rollWidthM = widthMatch ? parseFloat(widthMatch[1]) : 1.27;
  return {
    kind: 'roll',
    key: itemName.toLowerCase(),
    label: itemName,
    rollWidthM,
  };
};

// Cubicación automática + glosa de cortes optimizados para cualquier Orden de Trabajo (OT)
export function computeOtCubicationAndCuts(items = [], kerf = 3) {
  const rigidMap = new Map();
  const rollMap = new Map();
  let totalAreaSqm = 0;
  let totalPieces = 0;

  (items || []).forEach((item, idx) => {
    const wM = parseFloat(item.width) || 0;
    const hM = parseFloat(item.height) || 0;
    const qty = Math.max(1, parseInt(item.quantity, 10) || 1);
    if (wM <= 0 || hM <= 0) return;

    totalPieces += qty;
    totalAreaSqm += wM * hM * qty;

    const spec = detectMaterialSpec(item.name, item.detail);
    if (spec.kind === 'rigid') {
      if (!rigidMap.has(spec.key)) {
        rigidMap.set(spec.key, {
          label: spec.label,
          sheetW: spec.sheetW,
          sheetH: spec.sheetH,
          parts: [],
        });
      }
      rigidMap.get(spec.key).parts.push({
        id: item.id || `ot-p-${idx}`,
        label: item.name,
        w: Math.round(wM * 1000),
        h: Math.round(hM * 1000),
        qty,
      });
    } else {
      if (!rollMap.has(spec.key)) {
        rollMap.set(spec.key, {
          label: spec.label,
          rollWidthM: spec.rollWidthM,
          cuts: [],
          linearMeters: 0,
          areaSqm: 0,
        });
      }
      const group = rollMap.get(spec.key);
      const rollW = spec.rollWidthM;
      // Calcular cuántas piezas caben a lo ancho del rollo (con y sin giro 90°)
      const fitNormal = Math.floor(rollW / wM);
      const fitRotated = Math.floor(rollW / hM);
      let linearForItem = 0;
      let across = 1;
      let orientNote = '';

      if (fitNormal >= 1 || fitRotated >= 1) {
        const lenNormal = fitNormal >= 1 ? Math.ceil(qty / fitNormal) * hM : Infinity;
        const lenRotated = fitRotated >= 1 ? Math.ceil(qty / fitRotated) * wM : Infinity;
        if (lenRotated < lenNormal) {
          across = fitRotated;
          linearForItem = lenRotated;
          orientNote = `${across} por ancho de rollo (girado)`;
        } else {
          across = fitNormal;
          linearForItem = lenNormal;
          orientNote = `${across} por ancho de rollo`;
        }
      } else {
        // Pieza más ancha que el rollo: requiere paños/traslape
        const panels = Math.ceil(Math.min(wM, hM) / rollW);
        linearForItem = panels * Math.max(wM, hM) * qty;
        orientNote = `${panels} paños empalmados`;
      }

      group.linearMeters += linearForItem;
      group.areaSqm += wM * hM * qty;
      group.cuts.push({
        name: item.name,
        wM,
        hM,
        qty,
        linearMeters: linearForItem,
        orientNote,
      });
    }
  });

  const rigidResults = Array.from(rigidMap.values()).map((g) => {
    const packed = packParts2D(g.sheetW, g.sheetH, kerf, true, g.parts);
    const patterns = summarizeSheetPatterns(packed.sheets, g.sheetW, g.sheetH);
    return {
      ...g,
      sheetCount: packed.sheets.length,
      efficiency: packed.efficiency,
      unplaced: packed.unplaced,
      patterns,
    };
  });

  const rollResults = Array.from(rollMap.values());

  return {
    totalPieces,
    totalAreaSqm,
    rigidResults,
    rollResults,
    hasOptimization: rigidResults.length > 0 || rollResults.length > 0,
  };
}
