/**
 * ============================================================================
 * LETREROS OLIVAR - BACKEND GOOGLE APPS SCRIPT
 * Sistema de Sincronización en la Nube con Google Sheets
 * ============================================================================
 * 
 * INSTRUCCIONES DE INSTALACIÓN (SÓLO 3 PASOS):
 * 
 * 1. Ve a Google Drive (https://drive.google.com) y crea una nueva "Hoja de cálculo de Google".
 *    Nómbrala: "Letreros Olivar - Base de Datos"
 * 
 * 2. En el menú superior de la hoja, haz clic en:
 *    Extensiones -> Apps Script
 *    - Borra todo el código que aparezca en el editor.
 *    - Pega TODO el contenido de este archivo.
 *    - Haz clic en el icono de disco (Guardar).
 * 
 * 3. En la esquina superior derecha, haz clic en:
 *    "Implementar" -> "Nueva implementación"
 *    - Tipo: "Aplicación web"
 *    - Descripción: "API Letreros Olivar"
 *    - Ejecutar como: "Yo" (tu cuenta de correo)
 *    - Quién tiene acceso: "Cualquier usuario" (Anyone)
 *    - Clic en "Implementar" (Autoriza los permisos de lectura/escritura si Google lo solicita).
 *    - COPIA LA URL DE LA APLICACIÓN WEB generada (termina en /exec).
 * 
 * 4. Pega esa URL en el panel de configuración de la Intranet de Letreros Olivar.
 *    ¡Listo! Las cotizaciones se sincronizarán en tiempo real automáticamente y 100% gratis.
 * ============================================================================
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'getAll';
    
    if (action === 'ping') {
      return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
    }
    
    // Obtener cotizaciones
    var quotesSheet = ss.getSheetByName('Cotizaciones');
    var quotesData = quotesSheet.getDataRange().getValues();
    var quotes = [];
    
    if (quotesData.length > 1) {
      for (var i = 1; i < quotesData.length; i++) {
        var row = quotesData[i];
        if (!row[0]) continue; // Sin correlativo
        
        var fullJsonStr = row[14] || '';
        var quoteObj = null;
        if (fullJsonStr) {
          try { quoteObj = JSON.parse(fullJsonStr); } catch(err) {}
        }
        
        if (!quoteObj) {
          quoteObj = {
            correlative: String(row[0]),
            date: String(row[1]),
            client: {
              name: String(row[2]),
              documentId: String(row[3]),
              phone: String(row[4]),
              email: String(row[5])
            },
            summary: String(row[6]),
            totals: {
              subtotal: Number(row[7]) || 0,
              taxAmount: Number(row[8]) || 0,
              total: Number(row[9]) || 0
            },
            status: String(row[10]),
            invoiceNumber: String(row[11]),
            purchaseOrderNumber: String(row[12]),
            notes: String(row[13])
          };
        }
        quotes.push(quoteObj);
      }
    }
    
    // Obtener correlativo
    var configSheet = ss.getSheetByName('Configuracion');
    var currentCorr = 101;
    if (configSheet.getLastRow() >= 2) {
      var val = configSheet.getRange(2, 2).getValue();
      if (val && !isNaN(val)) currentCorr = parseInt(val, 10);
    }
    
    // Obtener OTs
    var otSheet = ss.getSheetByName('OrdenesTrabajo');
    var otData = otSheet.getDataRange().getValues();
    var workOrders = [];
    if (otData.length > 1) {
      for (var j = 1; j < otData.length; j++) {
        var otRow = otData[j];
        if (!otRow[0]) continue;
        var otJsonStr = otRow[6] || '';
        var otObj = null;
        if (otJsonStr) {
          try { otObj = JSON.parse(otJsonStr); } catch(e) {}
        }
        if (!otObj) {
          otObj = {
            otFolio: String(otRow[0]),
            correlative: String(otRow[1]),
            client: { name: String(otRow[2]) },
            status: String(otRow[3]),
            deadline: String(otRow[4]),
            notes: String(otRow[5])
          };
        }
        workOrders.push(otObj);
      }
    }

    return jsonResponse({
      status: 'success',
      quotes: quotes,
      currentCorrelative: currentCorr,
      workOrders: workOrders,
      totalQuotes: quotes.length
    });
    
  } catch(error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    var raw = e.postData ? e.postData.contents : '';
    var payload = JSON.parse(raw || '{}');
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    initSheets(ss);
    
    var action = payload.action;
    
    if (action === 'saveQuote') {
      var q = payload.quote;
      saveOrUpdateQuoteRow(ss, q);
      return jsonResponse({ status: 'success', message: 'Cotización guardada exitosamente', correlative: q.correlative });
    }
    
    if (action === 'saveQuotesBatch') {
      var quotesList = payload.quotes || [];
      for (var k = 0; k < quotesList.length; k++) {
        saveOrUpdateQuoteRow(ss, quotesList[k]);
      }
      return jsonResponse({ status: 'success', message: quotesList.length + ' cotizaciones sincronizadas' });
    }
    
    if (action === 'updateStatus') {
      var corr = payload.correlative;
      var newStatus = payload.status;
      var invNum = payload.invoiceNumber;
      updateQuoteStatusInSheet(ss, corr, newStatus, invNum);
      return jsonResponse({ status: 'success', correlative: corr, newStatus: newStatus });
    }
    
    if (action === 'saveWorkOrder') {
      var ot = payload.workOrder;
      saveOrUpdateWorkOrderRow(ss, ot);
      return jsonResponse({ status: 'success', message: 'OT guardada exitosamente' });
    }
    
    if (action === 'updateCorrelative') {
      var num = payload.correlativeNumber;
      var configSheet = ss.getSheetByName('Configuracion');
      configSheet.getRange(2, 2).setValue(num);
      return jsonResponse({ status: 'success', currentCorrelative: num });
    }
    
    return jsonResponse({ status: 'unknown_action', action: action });
  } catch(error) {
    return jsonResponse({ status: 'error', message: error.toString() });
  }
}

// -------------------------------------------------------------
// FUNCIONES AUXILIARES DE ALMACENAMIENTO EN GOOGLE SHEETS
// -------------------------------------------------------------

function saveOrUpdateQuoteRow(ss, q) {
  if (!q || !q.correlative) return;
  var sheet = ss.getSheetByName('Cotizaciones');
  var data = sheet.getDataRange().getValues();
  var corr = String(q.correlative).trim().toUpperCase();
  var rowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === corr) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var clientName = (q.client && q.client.name) || '';
  var clientRut = (q.client && q.client.documentId) || '';
  var clientPhone = (q.client && q.client.phone) || '';
  var clientEmail = (q.client && q.client.email) || '';
  var itemsSummary = (q.items || []).map(function(it) {
    return (it.name || 'Item') + ' (' + (it.quantity || 1) + ' ud)';
  }).join(' | ');
  
  var subtotal = (q.totals && q.totals.subtotal) || 0;
  var iva = (q.totals && q.totals.taxAmount) || 0;
  var total = (q.totals && q.totals.total) || 0;
  var status = q.status || 'Emitida';
  var invoice = q.invoiceNumber || '';
  var oc = q.purchaseOrderNumber || '';
  var notes = q.workshopNotes || q.notes || '';
  var fullJson = JSON.stringify(q);
  var now = new Date();
  
  var rowValues = [
    corr,
    q.date || Utilities.formatDate(now, 'America/Santiago', 'dd/MM/yyyy'),
    clientName,
    clientRut,
    clientPhone,
    clientEmail,
    itemsSummary,
    subtotal,
    iva,
    total,
    status,
    invoice,
    oc,
    notes,
    fullJson,
    Utilities.formatDate(now, 'America/Santiago', 'dd/MM/yyyy HH:mm:ss')
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
  
  // Actualizar mayor correlativo
  var corrNum = parseInt(corr.replace(/\D/g, ''), 10);
  if (!isNaN(corrNum)) {
    var configSheet = ss.getSheetByName('Configuracion');
    var cur = parseInt(configSheet.getRange(2, 2).getValue() || '101', 10);
    if (corrNum >= cur) {
      configSheet.getRange(2, 2).setValue(corrNum + 1);
    }
  }
}

function updateQuoteStatusInSheet(ss, correlative, newStatus, invoiceNumber) {
  var sheet = ss.getSheetByName('Cotizaciones');
  var data = sheet.getDataRange().getValues();
  var corr = String(correlative).trim().toUpperCase();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === corr) {
      var row = i + 1;
      if (newStatus) sheet.getRange(row, 11).setValue(newStatus);
      if (invoiceNumber) sheet.getRange(row, 12).setValue(invoiceNumber);
      
      // Actualizar dentro del JSON completo también
      var fullJsonStr = sheet.getRange(row, 15).getValue();
      if (fullJsonStr) {
        try {
          var parsed = JSON.parse(fullJsonStr);
          if (newStatus) parsed.status = newStatus;
          if (invoiceNumber) parsed.invoiceNumber = invoiceNumber;
          sheet.getRange(row, 15).setValue(JSON.stringify(parsed));
        } catch(e) {}
      }
      break;
    }
  }
}

function saveOrUpdateWorkOrderRow(ss, ot) {
  if (!ot || (!ot.otFolio && !ot.correlative)) return;
  var sheet = ss.getSheetByName('OrdenesTrabajo');
  var data = sheet.getDataRange().getValues();
  var key = String(ot.otFolio || ot.correlative).trim().toUpperCase();
  var rowIndex = -1;
  
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim().toUpperCase() === key || String(data[i][1]).trim().toUpperCase() === key) {
      rowIndex = i + 1;
      break;
    }
  }
  
  var rowValues = [
    ot.otFolio || ('OT-' + (ot.correlative || '').replace('COT-', '')),
    ot.correlative || '',
    (ot.client && ot.client.name) || '',
    ot.status || 'por_iniciar',
    ot.deadline || '',
    ot.notes || '',
    JSON.stringify(ot),
    Utilities.formatDate(new Date(), 'America/Santiago', 'dd/MM/yyyy HH:mm:ss')
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
  } else {
    sheet.appendRow(rowValues);
  }
}

function initSheets(ss) {
  // 1. Hoja Cotizaciones
  var qSheet = ss.getSheetByName('Cotizaciones');
  if (!qSheet) {
    qSheet = ss.insertSheet('Cotizaciones');
    qSheet.appendRow([
      'Correlativo', 'Fecha', 'Cliente', 'RUT', 'Teléfono', 'Email', 
      'Resumen Trabajos', 'Subtotal Neto', 'IVA (19%)', 'Total CLP', 
      'Estado', 'N° Factura', 'N° Orden Compra', 'Notas', 'JSON_Completo', 'Última Modificación'
    ]);
    qSheet.getRange('A1:P1').setFontWeight('bold').setBackground('#E2E8F0');
    qSheet.setFrozenRows(1);
  }
  
  // 2. Hoja OrdenesTrabajo
  var otSheet = ss.getSheetByName('OrdenesTrabajo');
  if (!otSheet) {
    otSheet = ss.insertSheet('OrdenesTrabajo');
    otSheet.appendRow([
      'Folio OT', 'Correlativo COT', 'Cliente', 'Estado Taller', 'Plazo Entrega', 'Notas', 'JSON_Completo', 'Actualizado'
    ]);
    otSheet.getRange('A1:H1').setFontWeight('bold').setBackground('#E2E8F0');
    otSheet.setFrozenRows(1);
  }
  
  // 3. Hoja Configuracion
  var confSheet = ss.getSheetByName('Configuracion');
  if (!confSheet) {
    confSheet = ss.insertSheet('Configuracion');
    confSheet.appendRow(['Parámetro', 'Valor']);
    confSheet.appendRow(['Siguiente Correlativo', 101]);
    confSheet.getRange('A1:B1').setFontWeight('bold').setBackground('#E2E8F0');
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
