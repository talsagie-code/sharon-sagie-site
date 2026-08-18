# שאלון פגישת ייעוץ תכנוני — חיבור לשליחה

הטופס עצמו כבר באוויר בכתובת **https://sharonsagie.design/questionnaire**
(העמוד לא מקושר מהתפריט ולא מופיע בגוגל — רק מי שמקבל את הלינק רואה אותו).

כדי שהתשובות והתכניות באמת יגיעו לשרון, צריך חיבור חד־פעמי של כ־10 דקות.
זה אותו עיקרון בדיוק כמו `MAKE-IT-EASY-FORM-SETUP.md`, רק עם תוספת של קבצים.

מה זה נותן בסוף:

- כל שאלון נכנס כשורה ב-**Google Sheet**
- כל התכניות שהמשפחה העלתה נשמרות ב-**תיקייה נפרדת ב-Google Drive**, על שם המשפחה
- שרון מקבלת **מייל מסודר** עם כל התשובות ולינק לתיקייה

הכול רץ בחשבון הגוגל של שרון. אין שירות בתשלום, אין כרטיס אשראי, אין צד שלישי.

---

## שלב 0 — להתחבר כשרון

לפני הכול, לוודא שאתם מחוברים ל-Google עם **sharonsa.design@gmail.com**,
כדי שהגיליון, התיקייה והסקריפט יישבו בחשבון שלה.

## שלב 1 — ליצור את הגיליון

1. להיכנס ל-https://sheets.google.com וליצור גיליון חדש.
2. לקרוא לו למשל **"שאלוני ייעוץ תכנוני"**. אין צורך ליצור עמודות — הסקריפט יוצר אותן לבד.

## שלב 2 — להדביק את הסקריפט

1. בתוך הגיליון: תפריט **Extensions → Apps Script**.
2. למחוק את מה שכתוב שם ולהדביק את כל הקוד שלמטה.
3. ללחוץ על אייקון ה-**Save**.

```javascript
/** שאלון ייעוץ תכנוני — שרון שגיא */
const SHARON_EMAIL   = 'sharonsa.design@gmail.com';
const SHEET_NAME     = 'שאלונים';
const DRIVE_FOLDER   = 'שאלוני ייעוץ תכנוני';   // תיקיית האב ב-Drive, נוצרת לבד

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

/* ניתן לפתוח את כתובת הסקריפט בדפדפן כדי לוודא שהוא חי */
function doGet() {
  return json({ ok: true, alive: true });
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function parentFolder_() {
  const it = DriveApp.getFoldersByName(DRIVE_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(DRIVE_FOLDER);
}

function saveAnswers_(body) {
  const token = Utilities.getUuid();
  const stamp = Utilities.formatDate(new Date(), 'Asia/Jerusalem', 'yyyy-MM-dd HH:mm');
  const name  = (body.name || 'ללא שם').substring(0, 80);

  const folder = parentFolder_().createFolder(stamp.substring(0, 10) + ' — ' + name);

  PropertiesService.getScriptProperties().setProperty(token, JSON.stringify({
    name: name,
    stamp: stamp,
    answers: body.answers || [],
    folderId: folder.getId(),
    fileCount: 0
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

  /* --- שורה בגיליון --- */
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_NAME);
  const headers = ['תאריך', 'שמות', 'מספר קבצים', 'תיקיית תכניות'];
  const qs = rec.answers.map(function (a) { return a.q; });

  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(headers.concat(qs));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, headers.length + qs.length).setFontWeight('bold');
  }

  /* התאמה לעמודות הקיימות, כדי ששאלון עם פחות תשובות לא יזיז עמודות */
  const head = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0];
  const row = new Array(head.length).fill('');
  row[0] = rec.stamp; row[1] = rec.name; row[2] = rec.fileCount; row[3] = link;
  rec.answers.forEach(function (a) {
    let c = head.indexOf(a.q);
    if (c === -1) { head.push(a.q); c = head.length - 1; row.push(''); sh.getRange(1, c + 1).setValue(a.q).setFontWeight('bold'); }
    row[c] = a.a;
  });
  sh.appendRow(row);

  /* --- מייל לשרון --- */
  let html = '<div style="font-family:Arial,Helvetica,sans-serif;direction:rtl;text-align:right;color:#2A2420;line-height:1.7">';
  html += '<p style="font-size:15px">התקבל שאלון ייעוץ תכנוני חדש.</p>';
  html += '<p style="font-size:15px"><b>' + esc_(rec.name) + '</b><br>' + rec.stamp + '</p>';
  html += '<p style="font-size:15px">קבצים שצורפו: <b>' + rec.fileCount + '</b>' +
          (rec.fileCount ? ' — <a href="' + link + '">פתיחת תיקיית התכניות</a>' : '') + '</p><hr style="border:none;border-top:1px solid #E4DCD1">';

  let part = '';
  rec.answers.forEach(function (a) {
    if (a.part && a.part !== part) {
      part = a.part;
      html += '<h3 style="font-size:13px;letter-spacing:.12em;color:#8C4630;margin:22px 0 6px">' + esc_(part) + '</h3>';
    }
    html += '<p style="margin:12px 0"><span style="color:#6E665B;font-size:13px">' + esc_(a.q) +
            '</span><br><span style="font-size:15px">' + esc_(a.a).replace(/\n/g, '<br>') + '</span></p>';
  });
  html += '</div>';

  MailApp.sendEmail({
    to: SHARON_EMAIL,
    subject: 'שאלון ייעוץ תכנוני — ' + rec.name,
    htmlBody: html
  });

  props.deleteProperty(body.token);
  return { ok: true };
}

function esc_(s) {
  return String(s === undefined || s === null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
```

## שלב 3 — לפרסם כ-Web App

1. למעלה מימין: **Deploy → New deployment**.
2. ללחוץ על גלגל השיניים ולבחור **Web app**.
3. להגדיר:
   - **Description:** למשל `questionnaire`
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**  ← קריטי. בלי זה הטופס לא יוכל לשלוח.
4. **Deploy**. גוגל תבקש אישור הרשאות — לאשר.
   אם מופיע מסך "Google hasn't verified this app" → **Advanced → Go to (project) → Allow**.
   זה נורמלי לסקריפט שאתם עצמכם כתבתם.
5. להעתיק את ה-**Web app URL**. הוא נראה כך:
   `https://script.google.com/macros/s/AKfyc.../exec`

## שלב 4 — לשלוח לי את הכתובת

מדביקים לי כאן את ה-URL ואני מכניס אותו לעמוד ומעלה לאוויר.

*(למי שרוצה לעשות זאת לבד: בקובץ `src/pages/questionnaire.astro`, בשורה*
*`const ENDPOINT = 'PASTE_APPS_SCRIPT_URL_HERE';` — לשים את הכתובת בין הגרשיים, לשמור ולדחוף ל-main.)*

---

## בדיקה שהכול עובד

1. לפתוח את כתובת ה-Web App בדפדפן. אמור להופיע `{"ok":true,"alive":true}`.
2. אחרי שהכתובת נכנסה לעמוד — למלא את השאלון עד הסוף, לצרף קובץ קטן ולשלוח.
3. תוך שניות: שורה חדשה בגיליון, תיקייה חדשה ב-Drive עם הקובץ, ומייל לשרון.

## דברים שכדאי לדעת

- **מגבלת קבצים:** עד 18MB לקובץ, עד 60MB בסך הכול. אלה מגבלות של Apps Script, לא שרירותיות.
  מי שיש לו קובץ גדול יותר יראה הודעה שמפנה אותו לשלוח אותו ישירות במייל.
- **פורמטים:** PDF, JPG, PNG בלבד.
- **המשפחה יכולה לעצור באמצע ולחזור** — התשובות נשמרות בדפדפן שלהם עד לשליחה.
- **אם משנים את הקוד בסקריפט**, צריך לעשות **Deploy → Manage deployments → עריכה → Version: New version**
  אחרת השינוי לא ייכנס לתוקף. הכתובת עצמה נשארת אותה כתובת.
- **מכסות גוגל:** MailApp מוגבל ל־100 מיילים ביום בחשבון רגיל. לשימוש הזה זה הרבה מעבר למספיק.
