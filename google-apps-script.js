// ============================================================
// METASPHERE v5 — Google Sheets Backend
// PT Metaseti Digital Indonesia
// ============================================================

function setupSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // ── PROJECTS ──
  var ps = ss.getSheetByName('Projects') || ss.insertSheet('Projects');
  ps.clear();
  var ph = ['id','projectNo','name','client','clientInitials','services','price','withTax','paymentTerms','status','date','description','documentNames','documentUrls','createdAt','updatedAt'];
  ps.getRange(1,1,1,ph.length).setValues([ph]).setFontWeight('bold').setBackground('#000').setFontColor('#fff');
  ps.setFrozenRows(1);
  ps.setColumnWidth(1,120); ps.setColumnWidth(2,220); ps.setColumnWidth(3,220);
  ps.setColumnWidth(4,200); ps.setColumnWidth(5,100); ps.setColumnWidth(6,160);
  ps.setColumnWidth(7,130); ps.setColumnWidth(8,70); ps.setColumnWidth(9,130);
  ps.setColumnWidth(10,100); ps.setColumnWidth(11,100); ps.setColumnWidth(12,250);
  ps.setColumnWidth(13,250); ps.setColumnWidth(14,350);
  ps.getRange('G:G').setNumberFormat('#,##0');
  ps.getRange('K:K').setNumberFormat('yyyy-mm-dd');

  // ── PAYMENTS (with voucher types & approval) ──
  var py = ss.getSheetByName('Payments') || ss.insertSheet('Payments');
  py.clear();
  var pyh = ['id','voucherType','formNo','jobId','jobNo','date','paymentBy','itemsDisplay','totalAmount','status','createdBy','approvedBy','approvalNotes','items','createdAt'];
  py.getRange(1,1,1,pyh.length).setValues([pyh]).setFontWeight('bold').setBackground('#000').setFontColor('#fff');
  py.setFrozenRows(1);
  py.setColumnWidth(1,120); py.setColumnWidth(2,120); py.setColumnWidth(3,260);
  py.setColumnWidth(4,120); py.setColumnWidth(5,260); py.setColumnWidth(6,100);
  py.setColumnWidth(7,120); py.setColumnWidth(8,400); py.setColumnWidth(9,130);
  py.setColumnWidth(10,110); py.setColumnWidth(11,100); py.setColumnWidth(12,100);
  py.setColumnWidth(13,250);
  py.getRange('I:I').setNumberFormat('#,##0');
  py.getRange('F:F').setNumberFormat('yyyy-mm-dd');
  py.hideColumns(14);

  // ── JOURNAL (proper double-entry: Debit & Credit) ──
  var js = ss.getSheetByName('Journal') || ss.insertSheet('Journal');
  js.clear();
  var jh = ['id','date','description','account','debit','credit','refType','refNo','month','createdAt'];
  js.getRange(1,1,1,jh.length).setValues([jh]).setFontWeight('bold').setBackground('#000').setFontColor('#fff');
  js.setFrozenRows(1);
  js.setColumnWidth(1,120); js.setColumnWidth(2,100); js.setColumnWidth(3,280);
  js.setColumnWidth(4,200); js.setColumnWidth(5,150); js.setColumnWidth(6,150);
  js.setColumnWidth(7,80); js.setColumnWidth(8,220); js.setColumnWidth(9,60);
  js.getRange('B:B').setNumberFormat('yyyy-mm-dd');
  js.getRange('E:E').setNumberFormat('#,##0');
  js.getRange('F:F').setNumberFormat('#,##0');
  js.getRange(1,5).setHorizontalAlignment('right');
  js.getRange(1,6).setHorizontalAlignment('right');

  var def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) try { ss.deleteSheet(def); } catch(e) {}
  SpreadsheetApp.getUi().alert('Metasphere v5 ready!\n\nJournal: Double-entry (Debit & Credit columns).\nPayments: Voucher types + approval workflow.\nDocuments uploaded to Google Drive.\nAll accounts in English.\n\nDeploy as Web App now.');
}

// ── DRIVE HELPERS ──

function getProofFolder() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName('Metasphere Proofs');
  return it.hasNext() ? it.next() : root.createFolder('Metasphere Proofs');
}

function getDocFolder() {
  var root = DriveApp.getRootFolder();
  var it = root.getFoldersByName('Metasphere Documents');
  return it.hasNext() ? it.next() : root.createFolder('Metasphere Documents');
}

function uploadFile(folder, name, base64Data) {
  try {
    var parts = base64Data.split(',');
    var b64 = parts.length > 1 ? parts[1] : parts[0];
    var mimeRaw = parts.length > 1 ? parts[0] : '';
    var mime = 'application/pdf';
    if (mimeRaw.indexOf('image/') > -1) mime = mimeRaw.replace(/data:/, '').replace(/;base64/, '');
    else if (mimeRaw.indexOf('application/') > -1) mime = mimeRaw.replace(/data:/, '').replace(/;base64/, '');
    var blob = Utilities.newBlob(Utilities.base64Decode(b64), mime, name);
    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch(e) {
    Logger.log('Upload error: ' + e.message);
    return '';
  }
}

// ── ROUTES ──

function doGet(e) {
  try {
    var action = (e.parameter.action || '').trim();
    var payload = {};
    if (e.parameter.payload) {
      try { payload = JSON.parse(decodeURIComponent(e.parameter.payload)); }
      catch(err) { try { payload = JSON.parse(e.parameter.payload); } catch(e2) {} }
    }
    return json(route(action, payload));
  } catch(err) { return json({ success: false, error: err.message }); }
}

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    return json(route(body.action || '', body.payload || {}));
  } catch(err) { return json({ success: false, error: err.message }); }
}

function json(d) {
  return ContentService.createTextOutput(JSON.stringify(d)).setMimeType(ContentService.MimeType.JSON);
}

function route(action, p) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  switch(action) {
    case 'requestOtp': {
      var users = {
        'Metaseti01': { pw: 'MetasetiAdmin$123', role: 'admin' },
        'Metaseti02': { pw: 'MetasetiMaker$123', role: 'maker' }
      };
      var user = users[p.username];
      if (!user || user.pw !== p.password) return { success: false, error: 'Invalid credentials' };
      var code = String(Math.floor(100000 + Math.random() * 900000));
      var props = PropertiesService.getScriptProperties();
      props.setProperty('otp_' + p.username, code);
      props.setProperty('otp_time_' + p.username, String(new Date().getTime()));
      try {
        MailApp.sendEmail({
          to: 'metasetidigital@gmail.com',
          subject: 'Metasphere Login OTP — ' + code,
          htmlBody: '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:30px">'
            + '<h2 style="color:#000;margin:0 0 10px">Metasphere Verification</h2>'
            + '<p style="color:#666;font-size:14px;margin:0 0 24px">Your one-time password for <strong>' + p.username + '</strong>:</p>'
            + '<div style="background:#f5f5f5;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px">'
            + '<span style="font-family:monospace;font-size:36px;font-weight:700;letter-spacing:8px;color:#000">' + code + '</span>'
            + '</div>'
            + '<p style="color:#999;font-size:12px;margin:0">This code expires in 5 minutes. If you did not request this, please ignore.</p>'
            + '<hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>'
            + '<p style="color:#bbb;font-size:10px;margin:0">PT Metaseti Digital Indonesia — Metasphere</p>'
            + '</div>'
        });
      } catch(e) {
        Logger.log('Email error: ' + e.message);
        return { success: false, error: 'Failed to send OTP email: ' + e.message };
      }
      return { success: true, message: 'OTP sent' };
    }
    case 'verifyOtp': {
      var props = PropertiesService.getScriptProperties();
      var stored = props.getProperty('otp_' + p.username);
      var timeStr = props.getProperty('otp_time_' + p.username);
      var usedAt = props.getProperty('otp_used_' + p.username);
      // If OTP was already successfully used within 30s, allow through
      if (usedAt && (new Date().getTime() - Number(usedAt)) < 30000) {
        return { success: true, message: 'Already verified' };
      }
      if (!stored || !timeStr) return { success: false, error: 'No OTP found. Please request a new one.' };
      var elapsed = new Date().getTime() - Number(timeStr);
      if (elapsed > 300000) {
        props.deleteProperty('otp_' + p.username);
        props.deleteProperty('otp_time_' + p.username);
        return { success: false, error: 'OTP expired. Please request a new one.' };
      }
      if (String(p.otp).trim() !== String(stored).trim()) return { success: false, error: 'Invalid OTP code' };
      // Mark as used but keep for 30s to handle duplicate requests
      props.setProperty('otp_used_' + p.username, String(new Date().getTime()));
      props.deleteProperty('otp_' + p.username);
      props.deleteProperty('otp_time_' + p.username);
      return { success: true, message: 'Verified' };
    }
    case 'getAll': {
      var projects = read(ss,'Projects').map(function(r) {
        r.price = Number(r.price) || 0;
        r.withTax = r.withTax === true || r.withTax === 'TRUE' || r.withTax === 'true';
        return r;
      });
      var payments = read(ss,'Payments').map(function(r) {
        try { r.items = (typeof r.items === 'string' && r.items) ? JSON.parse(r.items) : []; } catch(e) { r.items = []; }
        r.totalAmount = Number(r.totalAmount) || 0;
        return r;
      });
      var journal = read(ss,'Journal').map(function(r) {
        r.debit = Number(r.debit) || 0;
        r.credit = Number(r.credit) || 0;
        return r;
      });
      return { success: true, projects: projects, payments: payments, journal: journal };
    }
    case 'addProject': {
      var docUrls = [];
      var docData = Array.isArray(p.documentData) ? p.documentData : [];
      if (docData.length > 0) {
        var docFolder = getDocFolder();
        docUrls = docData.map(function(d) {
          if (d.data) return uploadFile(docFolder, d.name || 'document.pdf', d.data);
          return '';
        }).filter(function(u) { return u; });
      }
      delete p.documentData;
      p.documentUrls = docUrls.join(', ');
      add(ss, 'Projects', p);
      var amt = Number(p.price) || 0;
      if (p.withTax === true || p.withTax === 'true') amt += Math.round(amt * 0.11);
      addJP(ss, p.date, p.name + ' \u2014 ' + p.client, 'Accounts Receivable', 'Service Revenue', amt, 'project', p.projectNo);
      return { success: true, documentUrls: docUrls };
    }
    case 'updateProject': {
      // Handle document uploads on update
      var newDocUrls = [];
      var newDocData = Array.isArray(p.documentData) ? p.documentData : [];
      if (newDocData.length > 0) {
        var docF = getDocFolder();
        newDocUrls = newDocData.map(function(d) {
          if (d.data) return uploadFile(docF, d.name || 'document.pdf', d.data);
          return '';
        }).filter(function(u) { return u; });
        // Append to existing URLs
        var existingUrls = cell(ss, 'Projects', p.id, 'documentUrls') || '';
        if (existingUrls && newDocUrls.length) p.documentUrls = existingUrls + ', ' + newDocUrls.join(', ');
        else if (newDocUrls.length) p.documentUrls = newDocUrls.join(', ');
      }
      delete p.documentData;
      update(ss, 'Projects', p.id, p);
      return { success: true };
    }
    case 'deleteProject': {
      var pNo = cell(ss, 'Projects', p.id, 'projectNo');
      del(ss, 'Projects', p.id);
      if (pNo) delByCol(ss, 'Journal', 'refNo', pNo);
      return { success: true };
    }
    case 'addPayment': {
      var arr = Array.isArray(p.items) ? p.items : [];
      var proofFolder = null;
      arr = arr.map(function(it) {
        if (it.proofData && it.proofName) {
          if (!proofFolder) proofFolder = getProofFolder();
          var url = uploadFile(proofFolder, it.proofName, it.proofData);
          return { description: it.description, amount: it.amount, proofName: it.proofName, proofUrl: url };
        }
        return { description: it.description, amount: it.amount, proofName: it.proofName || '', proofUrl: '' };
      });
      // Clean items display
      var lines = [];
      for (var idx = 0; idx < arr.length; idx++) {
        var it = arr[idx];
        var amt = Number(it.amount) || 0;
        var line = (idx + 1) + '. ' + (it.description || '');
        line += '  |  Rp' + amt.toLocaleString('id-ID');
        if (it.proofUrl) {
          lines.push(line);
          lines.push('   Proof: ' + it.proofUrl);
        } else if (it.proofName) {
          line += '  |  Proof: ' + it.proofName;
          lines.push(line);
        } else {
          lines.push(line);
        }
      }
      var display = lines.join('\n');
      var pd = {};
      for (var k in p) {
        if (k === 'items') { pd.items = JSON.stringify(arr); pd.itemsDisplay = display; }
        else pd[k] = p[k];
      }
      if (!pd.itemsDisplay) pd.itemsDisplay = display;
      add(ss, 'Payments', pd);
      var total = Number(p.totalAmount) || 0;
      var hasJob = p.jobNo && p.jobNo !== '';
      var desc = (arr.length > 0 ? arr[0].description : '') + (p.jobNo ? ' [' + p.jobNo + ']' : '');
      var vt = p.voucherType || 'payment';
      var drAcc = '', crAcc = '';
      if (vt === 'receipt') { drAcc = 'Cash'; crAcc = hasJob ? 'Accounts Receivable' : 'Other Income'; }
      else if (vt === 'payment') { drAcc = hasJob ? 'Project Expense' : 'Operational Expense'; crAcc = 'Cash'; }
      else if (vt === 'advance') { drAcc = 'Purchase Advance'; crAcc = 'Cash'; }
      else if (vt === 'refund') { drAcc = 'Cash'; crAcc = hasJob ? 'Project Expense' : 'Operational Expense'; }
      else { drAcc = 'Operational Expense'; crAcc = 'Cash'; }
      addJP(ss, p.date, desc, drAcc, crAcc, total, 'voucher', p.formNo);
      return { success: true };
    }
    case 'updatePayment': { update(ss, 'Payments', p.id, p); return { success: true }; }
    case 'deletePayment': {
      var fNo = cell(ss, 'Payments', p.id, 'formNo');
      del(ss, 'Payments', p.id);
      if (fNo) delByCol(ss, 'Journal', 'refNo', fNo);
      return { success: true };
    }
    case 'addJournalPair': {
      addJP(ss, p.date, p.description, p.debitAccount, p.creditAccount, Number(p.amount)||0, 'manual', p.refNo||'');
      return { success: true };
    }
    case 'deleteJournalEntry': {
      del(ss, 'Journal', p.id);
      del(ss, 'Journal', p.id + '_cr');
      return { success: true };
    }
    default: return { success: false, error: 'Unknown: ' + action };
  }
}

// Double-entry journal pair
function addJP(ss, date, desc, drAcc, crAcc, amt, refType, refNo) {
  if (!amt || amt <= 0) return;
  var bid = Utilities.getUuid().substr(0,12);
  var m = date ? new Date(date).getMonth() + 1 : 0;
  var now = new Date().toISOString();
  add(ss, 'Journal', { id: bid, date: date, description: desc, account: drAcc, debit: amt, credit: 0, refType: refType, refNo: refNo, month: m, createdAt: now });
  add(ss, 'Journal', { id: bid + '_cr', date: date, description: desc, account: crAcc, debit: 0, credit: amt, refType: refType, refNo: refNo, month: m, createdAt: now });
}

function read(ss,name) { var s=ss.getSheetByName(name); if(!s||s.getLastRow()<=1)return[]; var d=s.getDataRange().getValues(),h=d[0],r=[]; for(var i=1;i<d.length;i++){var o={};for(var j=0;j<h.length;j++){var v=d[i][j];o[h[j]]=(v instanceof Date)?Utilities.formatDate(v,Session.getScriptTimeZone(),'yyyy-MM-dd'):v;}if(o.id&&String(o.id).trim()!=='')r.push(o);}return r; }
function add(ss,name,p) { var s=ss.getSheetByName(name);if(!s)return;var h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0];s.appendRow(h.map(function(c){return(p[c]!==undefined&&p[c]!==null)?p[c]:'';})); }
function update(ss,name,id,u) { var s=ss.getSheetByName(name);if(!s)return;var d=s.getDataRange().getValues(),h=d[0],ic=h.indexOf('id');if(ic===-1)return;for(var i=1;i<d.length;i++){if(String(d[i][ic]).trim()===String(id).trim()){for(var j=0;j<h.length;j++){if(u[h[j]]!==undefined)s.getRange(i+1,j+1).setValue(u[h[j]]);}return;}} }
function del(ss,name,id) { var s=ss.getSheetByName(name);if(!s)return;var d=s.getDataRange().getValues(),ic=d[0].indexOf('id');if(ic===-1)return;for(var i=d.length-1;i>=1;i--){if(String(d[i][ic]).trim()===String(id).trim()){s.deleteRow(i+1);return;}} }
function delByCol(ss,name,col,val) { if(!val)return;var s=ss.getSheetByName(name);if(!s)return;var d=s.getDataRange().getValues(),ci=d[0].indexOf(col);if(ci===-1)return;for(var i=d.length-1;i>=1;i--){if(String(d[i][ci]).trim()===String(val).trim())s.deleteRow(i+1);} }
function cell(ss,name,id,col) { var s=ss.getSheetByName(name);if(!s)return'';var d=s.getDataRange().getValues(),h=d[0];var ic=h.indexOf('id'),vc=h.indexOf(col);if(ic===-1||vc===-1)return'';for(var i=1;i<d.length;i++){if(String(d[i][ic]).trim()===String(id).trim())return String(d[i][vc]);}return''; }
