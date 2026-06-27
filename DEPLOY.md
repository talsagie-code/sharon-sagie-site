# העלאת האתר לאוויר + פאנל ניהול (GitHub → Cloudflare Pages → Sveltia CMS)

האתר בנוי ב-Astro. כל התוכן (פרויקטים, תמונות, המלצות וכל הטקסטים) יושב בקבצים נתונים
ב-`src/data/` וניתן לעריכה דרך פאנל ניהול ויזואלי בכתובת `/admin`.

## 1. העלאה ל-GitHub
1. פתחו חשבון/היכנסו ל-GitHub וצרו repo חדש בשם `sharon-sagie-site` (פרטי או ציבורי).
2. מתוך תיקיית הפרויקט, הריצו:
   ```bash
   git add -A
   git commit -m "Sharon Sagie site"
   git branch -M main
   git remote add origin https://github.com/USER/sharon-sagie-site.git
   git push -u origin main
   ```
   (החליפו `USER` בשם המשתמש שלכם.)

## 2. אחסון בענן — Cloudflare Pages (חינם)
1. היכנסו ל-Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. בחרו את ה-repo `sharon-sagie-site`.
3. הגדרות בנייה:
   - **Framework preset:** Astro
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. **Save and Deploy**. תוך דקה האתר עולה בכתובת `*.pages.dev`.
5. לחיבור דומיין (למשל `sharon-sagie.co.il`): בלשונית **Custom domains** מוסיפים את הדומיין ומעדכנים את ה-DNS לפי ההוראות.

## 3. הפעלת פאנל הניהול (כדי ששרון תוכל לערוך לבד)
פתחו את `public/admin/config.yml` ובשורת `repo:` הכניסו `USER/sharon-sagie-site`.

Sveltia CMS צריך הרשאת GitHub. הדרך המומלצת ב-Cloudflare:
1. ב-GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**
   - Homepage URL: כתובת האתר
   - Authorization callback URL: כתובת ה-worker מהשלב הבא + `/callback`
   שמרו את ה-**Client ID** וה-**Client Secret**.
2. פרסו את ה-worker המוכן של Sveltia לאימות:
   https://github.com/sveltia/sveltia-cms-auth — לפי ההוראות שם (Deploy to Cloudflare),
   והזינו את ה-Client ID/Secret כ-secrets.
3. הוסיפו ל-`config.yml` מתחת ל-`backend:` את השורה:
   ```yaml
   base_url: https://<כתובת-ה-worker-שלכם>
   ```
4. דחפו את השינוי (git push) — Cloudflare יבנה מחדש.

מעכשיו: נכנסים ל-`https://your-site/admin`, מתחברים עם GitHub, ועורכים.
שינוי נשמר → נדחף ל-GitHub → Cloudflare בונה מחדש → האתר מתעדכן תוך ~דקה.

## 4. איך עורכים (לשרון)
- **פרויקטים → תמונות:** גוררים תמונות לשינוי סדר, לוחצים מחיקה להסרה, "Add" + העלאה לתמונה חדשה. התמונה הראשונה = שער הפרויקט.
- **טקסטים באתר:** עריכת כל כותרת/פסקה/מחיר. Enter = שורה חדשה בכותרות.
- **המלצות:** הוספה/עריכה/מחיקה.

## הערה על התמונות הקיימות
תמונות הפרויקטים הקיימות נטענות כרגע מה-CDN של Two Studio (עובד, אבל תלוי באתר ההוא).
מומלץ בהמשך להוריד את קבצי המקור ולהעלות אותם דרך הפאנל (הם יישמרו ב-`public/uploads`
בתוך ה-repo) — כך האתר עצמאי לחלוטין. תמונות חדשות שמעלים דרך הפאנל כבר נשמרות ב-repo.
