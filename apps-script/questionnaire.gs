/**
 * שאלון ייעוץ תכנוני — שרון שגיא
 * גרסה 2
 *
 * מה השתנה מגרסה 1:
 *  - הקבצים מצורפים ישירות למייל, ולא רק כלינק ל-Drive.
 *    לינק ל-Drive עובד רק אם פותחים אותו כשמחוברים לחשבון הגוגל שבו הסקריפט רץ.
 *    אם קוראים את המייל בדפדפן/טלפון שמחובר לחשבון אחר — לחיצה על הלינק לא עושה כלום.
 *    קובץ מצורף נפתח תמיד, מכל מכשיר ומכל חשבון.
 *  - הרשאת צפייה בתיקייה ניתנת במפורש לכתובת שאליה נשלח המייל,
 *    כך שהלינק יעבוד גם אם הסקריפט הותקן תחת חשבון גוגל אחר.
 *  - המייל מציג גם את כתובת התיקייה כטקסט מלא, להעתקה ידנית במקרה הצורך.
 *  - doGet מדווח באיזה חשבון הסקריפט רץ בפועל — נוח לאבחון.
 */

const SHARON_EMAIL = 'sharonsa.design@gmail.com';
const SHEET_NAME   = 'שאלונים';
const DRIVE_FOLDER = 'שאלוני ייעוץ תכנוני';

/* גמייל חוסם מיילים מעל 25MB. משאירים מרווח. */
const MAX_ATTACH_MB = 20;

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.type === 'answers') return json(saveAnswers_(body));
    if (body.type === 'file')    return json(saveFile_(body));
    if (body.type === 'finish')  return json(finish_(body));
    return json({ ok: false, error: 'unknown type' });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({
    ok: true,
    alive: true,
    runningAs: safeUser_(),
    mailTo: SHARON_EMAIL
  });
}

function safeUser_() {
  try { return Session.getEffectiveUser().getEmail(); } catch (err) { return 'unknown'; }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parentFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER);
}

function saveAnswers_(body) {
  const token = Utilities.getUuid();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
  const name  = String(body.name || 'ללא שם').substring(0, 80);

  const folder = parentFolder_().createFolder(stamp.substring(0, 10) + ' — ' + name);

  /* אם הסקריפט רץ תחת חשבון אחר משרון — בלי זה היא לא תוכל לפתוח את התיקייה */
  try { folder.addViewer(SHARON_EMAIL); } catch (err) {}

  PropertiesService.getScriptProperties().setProperty(token, JSON.stringify({
    name: name, stamp: stamp, answers: body.answers || [],
    folderId: folder.getId(), fileCount: 0
  }));

  return { ok: true, token: token };
}

function saveFile_(body) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(body.token);
  if (!raw) return { ok: false, error: 'unknown token' };
  const rec = JSON.parse(raw);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(body.data),
    body.mime || 'application/octet-stream',
    body.filename || 'file'
  );
  DriveApp.getFolderById(rec.folderId).createFile(blob);

  rec.fileCount = (rec.fileCount || 0) + 1;
  props.setProperty(body.token, JSON.stringify(rec));
  return { ok: true };
}

function finish_(body) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty(body.token);
  if (!raw) return { ok: false, error: 'unknown token' };
  const rec = JSON.parse(raw);

  const folder = DriveApp.getFolderById(rec.folderId);
  const link = folder.getUrl();

  /* ---------- שורה בגיליון ---------- */
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  const headers = ['תאריך', 'שמות', 'מספר קבצים', 'תיקיית תכניות'];

  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(headers.concat(rec.answers.map(function (a) { return a.q; })));
    sh.setFrozenRows(1);
  }

  const head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const row = new Array(head.length).fill('');
  row[0] = rec.stamp; row[1] = rec.name; row[2] = rec.fileCount; row[3] = link;
  rec.answers.forEach(function (a) {
    let c = head.indexOf(a.q);
    if (c === -1) {
      head.push(a.q); c = head.length - 1; row.push('');
      sh.getRange(1, c + 1).setValue(a.q).setFontWeight('bold');
    }
    row[c] = a.a;
  });
  sh.appendRow(row);

  /* ---------- קבצים מצורפים ---------- */
  const attachments = [];
  const tooBig = [];
  let bytes = 0;
  const limit = MAX_ATTACH_MB * 1024 * 1024;
  const it = folder.getFiles();
  while (it.hasNext()) {
    const f = it.next();
    const size = f.getSize();
    if (bytes + size <= limit) { attachments.push(f.getBlob()); bytes += size; }
    else { tooBig.push(f.getName()); }
  }

  /* ---------- מייל ---------- */
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#2A2420;line-height:1.7">';
  html += '<p style="font-size:15px">התקבל שאלון ייעוץ תכנוני חדש.</p>';
  html += '<p style="font-size:15px"><b>' + esc_(rec.name) + '</b><br>' + rec.stamp + '</p>';

  if (rec.fileCount) {
    html += '<p style="font-size:15px">התכניות (' + rec.fileCount + ' קבצים) מצורפות למייל הזה';
    if (tooBig.length) {
      html += '. הקבצים הבאים גדולים מדי לצירוף ונמצאים רק בתיקייה: ' + esc_(tooBig.join(', '));
    }
    html += '.</p>';
    html += '<p style="font-size:13px;color:#6E665B">גיבוי ב-Drive: <a href="' + link + '">' + link + '</a></p>';
  } else {
    html += '<p style="font-size:15px">לא צורפו תכניות.</p>';
  }

  html += '<hr style="border:none;border-top:1px solid #E4DCD1">';

  let part = '';
  rec.answers.forEach(function (a) {
    if (a.part && a.part !== part) {
      part = a.part;
      html += '<h3 style="font-size:13px;letter-spacing:.12em;color:#8C4630;margin:22px 0 6px">' + esc_(part) + '</h3>';
    }
    html += '<p style="margin:12px 0"><span style="color:#6E665B;font-size:13px">' + esc_(a.q) +
            '</span><br><span style="font-size:15px">' + esc_(a.a).replace(/\n/g, '<br>') + '</span></p>';
  });

  html += '<p style="margin-top:26px;font-size:11px;color:#9A9186">נשלח אוטומטית מהשאלון באתר · הסקריפט רץ תחת ' + esc_(safeUser_()) + '</p>';
  html += '</div>';

  MailApp.sendEmail({
    to: SHARON_EMAIL,
    subject: 'שאלון ייעוץ תכנוני — ' + rec.name,
    htmlBody: html,
    attachments: attachments
  });

  props.deleteProperty(body.token);
  return { ok: true, link: link, attached: attachments.length, runningAs: safeUser_() };
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
