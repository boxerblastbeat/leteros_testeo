// --- TARIFARIO OFICIAL DE TALLER (Fuente: Planilla Excel Taller Letreros Olivar SpA) ---
export const DEFAULT_WORKSHOP_MATERIALS = [
  // Acrílicos y Placas Rígidas
  { id: 'mat-1', name: 'Acrílico Blanco 3mm', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 70000, pricePerSqm: 25000, unit: 'm²' },
  { id: 'mat-2', name: 'Acrílico Transparente 3mm', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 70000, pricePerSqm: 25000, unit: 'm²' },
  { id: 'mat-3', name: 'Acrílico Transparente 5mm', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 121000, pricePerSqm: 45000, unit: 'm²' },
  { id: 'mat-4', name: 'Aluminio Compuesto 3mm (ACM)', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 68000, pricePerSqm: 32000, unit: 'm²' },
  { id: 'mat-5', name: 'PVC Espumado 3mm (Trovicel)', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 120000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-6', name: 'PVC Espumado 5mm (Trovicel)', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 0, pricePerSqm: 22000, unit: 'm²' },
  { id: 'mat-7', name: 'PVC Espumado 10mm (Trovicel)', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 35000, pricePerSqm: 35000, unit: 'm²' },
  { id: 'mat-8', name: 'Foam Board 5mm', category: 'Acrílicos y Rígidos', format: '1.22x2.44', cost: 218000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-9', name: 'Lata Galvanizada 0.8mm', category: 'Acrílicos y Rígidos', format: '1.0x3.0', cost: 24000, pricePerSqm: 24000, unit: 'm²' },
  { id: 'mat-10', name: 'Lata Galvanizada 1mm', category: 'Acrílicos y Rígidos', format: '1.0x3.0', cost: 28000, pricePerSqm: 28000, unit: 'm²' },

  // Telas PVC & Banners
  { id: 'mat-11', name: 'Tela PVC 340gr (1.10m)', category: 'Telas PVC & Banners', format: '1.10x50', cost: 66000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-12', name: 'Tela PVC 340gr (1.60m)', category: 'Telas PVC & Banners', format: '1.60x50', cost: 96000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-13', name: 'Tela PVC 340gr (2.20m)', category: 'Telas PVC & Banners', format: '2.20x50', cost: 141000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-14', name: 'Tela PVC Mate 380gr (1.10m)', category: 'Telas PVC & Banners', format: '1.10x50', cost: 75000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-15', name: 'Tela PVC Mate 380gr (1.60m)', category: 'Telas PVC & Banners', format: '1.60x50', cost: 109000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-16', name: 'Tela PVC 380gr (3.20m Gran Formato)', category: 'Telas PVC & Banners', format: '3.20x50', cost: 215000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-17', name: 'Tela PVC 440gr Reforzada (1.10m)', category: 'Telas PVC & Banners', format: '1.10x50', cost: 79000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-18', name: 'Tela PVC 440gr Reforzada (1.60m)', category: 'Telas PVC & Banners', format: '1.60x50', cost: 115000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-19', name: 'Tela PVC Reverso Negro (Blackout 3.20m)', category: 'Telas PVC & Banners', format: '3.20x50', cost: 167000, pricePerSqm: 14000, unit: 'm²' },

  // Vinilos y Adhesivos
  { id: 'mat-20', name: 'Vinilo Alta Adherencia 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 97000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-21', name: 'Vinilo Alta Adherencia 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 82000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-22', name: 'Adhesivo 100 Micrones 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 73000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-23', name: 'Adhesivo 100 Micrones 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 87000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-24', name: 'Adhesivo 80 Micrones 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 58000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-25', name: 'Adhesivo 80 Micrones 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 67000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-26', name: 'Adhesivo Reflectante 1.24m', category: 'Vinilos & Adhesivos', format: '1.24x45', cost: 170000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-27', name: 'Adhesivo Reflectante 0.61m', category: 'Vinilos & Adhesivos', format: '0.61x45', cost: 85000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-28', name: 'Adhesivo Transparente Glossy 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 77000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-29', name: 'Adhesivo Transparente Glossy 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 90000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-30', name: 'Papel Sintético 200 Micrones 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 86000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-31', name: 'Papel Sintético 200 Micrones 0.941m', category: 'Vinilos & Adhesivos', format: '0.941x50', cost: 73000, pricePerSqm: 14000, unit: 'm²' },
  { id: 'mat-32', name: 'Laminado Glossy 1.07m', category: 'Vinilos & Adhesivos', format: '1.07x50', cost: 65000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-33', name: 'Laminado Glossy 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 77000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-34', name: 'Laminado Glossy 1.52m', category: 'Vinilos & Adhesivos', format: '1.52x50', cost: 92000, pricePerSqm: 18000, unit: 'm²' },
  { id: 'mat-35', name: 'Dusted / Empavonado 1.22m', category: 'Vinilos & Adhesivos', format: '1.22x50', cost: 278000, pricePerSqm: 21000, unit: 'm²' },
  { id: 'mat-36', name: 'Window Vision (Microperforado) 1.27m', category: 'Vinilos & Adhesivos', format: '1.27x50', cost: 253000, pricePerSqm: 21000, unit: 'm²' },
  { id: 'mat-37', name: 'Imantado Vehicular 0.61m', category: 'Vinilos & Adhesivos', format: '0.61x50', cost: 118000, pricePerSqm: 8000, unit: 'm²' },
  { id: 'mat-38', name: 'Vinilo Decorativo 0.61m', category: 'Vinilos & Adhesivos', format: '0.61x50', cost: 80000, pricePerSqm: 5000, unit: 'm²' },
  { id: 'mat-39', name: 'Papel Transfer 0.305m', category: 'Vinilos & Adhesivos', format: '0.305x91.44', cost: 66000, pricePerSqm: 12000, unit: 'm²' },

  // Cajas de Luz, Letreros & Rollers
  { id: 'mat-40', name: 'Cajón Luminoso Galvanizado', category: 'Letreros & Cajas de Luz', format: 'A medida', cost: 100000, pricePerSqm: 180000, unit: 'm²' },
  { id: 'mat-41', name: 'Letrero Luminoso en Acrílico', category: 'Letreros & Cajas de Luz', format: 'A medida', cost: 110000, pricePerSqm: 180000, unit: 'm²' },
  { id: 'mat-42', name: 'Roller Clip 80x200cm (Estructura + Gráfica)', category: 'Letreros & Cajas de Luz', format: '80x200cm', cost: 30000, pricePerSqm: 27000, unit: 'unidad' }
];

export const DEFAULT_WORKSHOP_CONSUMABLES = [
  { id: 'con-1', name: 'Perfil Fierro 20x20x2mm', format: 'Tira 6m', cost: 6690, price: 9000, unit: 'tira' },
  { id: 'con-2', name: 'Perfil Fierro 30x30x2mm', format: 'Tira 6m', cost: 11690, price: 15000, unit: 'tira' },
  { id: 'con-3', name: 'Perfil Fierro 50x50x2mm', format: 'Tira 6m', cost: 18990, price: 22000, unit: 'tira' },
  { id: 'con-4', name: 'Pino Cepillado 2x2" (Bastidor madera)', format: 'Tira 3.2m', cost: 2650, price: 6000, unit: 'tira' },
  { id: 'con-5', name: 'Pino Cepillado 2x1" (Bastidor madera)', format: 'Tira 3.2m', cost: 1550, price: 6000, unit: 'tira' },
  { id: 'con-6', name: 'Espaciadores Metálicos Chico', format: 'Unidad', cost: 800, price: 1500, unit: 'unidad' },
  { id: 'con-7', name: 'Espaciadores Metálicos Grande', format: 'Unidad', cost: 1600, price: 3000, unit: 'unidad' },
  { id: 'con-8', name: 'Tubo LED 1.20m', format: 'Unidad', cost: 4500, price: 6500, unit: 'unidad' },
  { id: 'con-9', name: 'Tubo LED 0.60m', format: 'Unidad', cost: 3500, price: 4500, unit: 'unidad' }
];

export const PRODUCTS_CATALOG = DEFAULT_WORKSHOP_MATERIALS.map(m => ({
  id: m.id,
  name: m.name,
  category: m.category,
  calcType: m.unit === 'unidad' ? 'unit' : 'sqm',
  defaultPrice: m.pricePerSqm,
  unitLabel: m.unit,
  description: `Formato: ${m.format} | Precio: $${m.pricePerSqm.toLocaleString('es-CL')} / ${m.unit}`,
  options: []
}));

// --- COMPOSICIÓN DEL LETRERO (MULTICAPA) Y ACABADOS / SERVICIOS ---
export const DEFAULT_COMPOSITION_LAYERS = {
  adhesivo: {
    active: false,
    label: 'Adhesivo Vinilo Impreso (1440dpi)',
    price: 14000,
    perSqm: true,
  },
  laminado: {
    active: false,
    label: 'Termolaminado de Protección UV (Mate / Brillo)',
    price: 8000,
    perSqm: true,
  },
  dobleContacto: {
    active: false,
    label: 'Cinta Doble Contacto Espumada de Montaje',
    price: 3500,
    perSqm: true,
  },
  placaExtra: {
    active: false,
    label: 'Segunda Placa / Respaldo Adicional',
    price: 15000,
    perSqm: true,
  },
};

export const DEFAULT_FINISHES = {
  termosellado: {
    active: false,
    label: 'Termosellado perimetral con ojetillos',
    price: 2500,
    perSqm: true,
  },
  bolsillo: {
    active: false,
    label: 'Bolsillo pasante de caño (PVC o madera)',
    price: 3500,
    perSqm: true,
  },
  bastidorMadera: {
    active: false,
    label: 'Bastidor de madera (pino cepillado)',
    price: 15000,
    perSqm: false,
  },
  bastidorFierro: {
    active: false,
    label: 'Bastidor de fierro estructurado',
    price: 25000,
    perSqm: false,
  },
  instalacion: {
    active: false,
    label: 'Instalación con estructura en terreno',
    price: 30000,
    perSqm: false,
  },
  espaciadores: {
    active: false,
    label: 'Espaciadores metálicos inox',
    price: 6000,
    perSqm: false,
  },
  iluminacion: {
    active: false,
    label: 'Iluminación LED instalada',
    price: 25000,
    perSqm: false,
  },
};

// Detecta sustratos rígidos (Foam, Fomex/Trovicel, ACM, Acrílico, Lata) que llevan adhesivo por defecto
export const isRigidSubstrate = (materialOrName) => {
  if (!materialOrName) return false;
  if (typeof materialOrName === 'object') {
    if (materialOrName.category === 'Acrílicos y Rígidos') return true;
    materialOrName = materialOrName.name || '';
  }
  return /foam|fomex|trovicel|pvc espumado|acm|aluminio compuesto|acr[ií]lico|lata/i.test(
    String(materialOrName)
  );
};
