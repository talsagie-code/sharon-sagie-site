# Make it Easy — connecting the lead form to a Google Sheet + email

The landing page form is built. To make it actually record leads and email
Sharon, do this one-time setup (about 5 minutes). It uses a free Google Apps
Script — no paid service, no credit card.

## Step 0 — Log in as Sharon
Make sure you're signed into Google as **sharonsa.design@gmail.com** first, so the
leads sheet and the script live under Sharon's own account.

## Step 1 — Create the Google Sheet
1. Go to https://sheets.google.com and create a new blank spreadsheet.
2. Name it something like **"לידים — Make it Easy"**. (You can leave the tab empty; the script creates the columns.)

## Step 2 — Add the script
1. In that spreadsheet, open menu **Extensions → Apps Script**.
2. Delete whatever code is there and paste the code below (Sharon's email is already filled in).
3. Click the **Save** icon.

```javascript
const SHARON_EMAIL = 'sharonsa.design@gmail.com';
const SHEET_NAME = 'Leads';

function doPost(e) {
  try {
    const p = (e && e.parameter) || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName(SHEET_NAME);
    if (!sh) {
      sh = ss.insertSheet(SHEET_NAME);
      sh.appendRow(['תאריך', 'שם פרטי', 'שם משפחה', 'מייל', 'נייד', 'מקור']);
    }
    const now = new Date();
    sh.appendRow([now, p.first || '', p.last || '', p.email || '', p.phone || '', p.source || '']);

    const name = ((p.first || '') + ' ' + (p.last || '')).trim();
    const subject = 'ליד חדש מהאתר (' + (p.source || 'Make it Easy') + '): ' + name;
    const body =
      'התקבל ליד חדש:\n\n' +
      'שם: ' + name + '\n' +
      'מייל: ' + (p.email || '') + '\n' +
      'נייד: ' + (p.phone || '') + '\n' +
      'מקור: ' + (p.source || '') + '\n' +
      'זמן: ' + now.toLocaleString('he-IL');
    MailApp.sendEmail(SHARON_EMAIL, subject, body);

    return ContentService.createTextOutput('ok');
  } catch (err) {
    return ContentService.createTextOutput('error: ' + err);
  }
}
```

## Step 3 — Deploy it as a Web App
1. Top-right, click **Deploy → New deployment**.
2. Click the gear icon → choose **Web app**.
3. Set:
   - **Description:** anything (e.g. "leads")
   - **Execute as:** *Me*
   - **Who has access:** **Anyone**
4. Click **Deploy**. Google will ask you to authorize — approve it (it's your own script). You may see a "Google hasn't verified this app" screen → click **Advanced → Go to (project) → Allow**. This is normal for your own scripts.
5. Copy the **Web app URL** it gives you. It looks like:
   `https://script.google.com/macros/s/AKfyc.../exec`

## Step 4 — Send me that URL
Paste the Web app URL back to me here, and I'll drop it into the page
(`FORM_ENDPOINT` in `make-it-easy.astro`) and redeploy. From then on, every
form submission will:
- add a row to the Google Sheet, and
- email Sharon the lead details.

*(If you'd rather do it yourself: open `src/pages/make-it-easy.astro`, find the
line `const FORM_ENDPOINT = 'PASTE_APPS_SCRIPT_URL_HERE';` and put the URL between
the quotes.)*

## Testing
After the URL is in place, open the page, fill the form, and submit. A row should
appear in the sheet within a second or two, and Sharon should get an email. If
you ever want the leads to go to more than one address, tell me and I'll adjust.
