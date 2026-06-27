# שרון שגיא — אתר עיצוב פנים (Astro)

אתר תדמית רב-עמודי לשרון שגיא, עיצוב פנים ותכנון הבית. בנוי ב-Astro.

## הרצה מקומית
```bash
npm install
npm run dev      # תצוגה מקדימה בכתובת http://localhost:4321
npm run build    # בונה אתר סטטי לתיקיית dist/
```

## מבנה
- `src/pages/` — עמודי האתר (כרגע: דף הבית `index.astro`).
- `src/layouts/Base.astro` — שלד עם ניווט + פוטר.
- `src/components/` — Nav, Footer.
- `src/data/projects.js` — תוכן הפרויקטים, ההמלצות ותמונות ההירו (מקום אחד לעריכת תוכן).
- `src/styles/global.css` — צבעים, טיפוגרפיה, RTL.
- `public/assets/` — לוגו ותמונת פרופיל.

## אחסון (מומלץ)
GitHub repo → Cloudflare Pages (build command: `npm run build`, output dir: `dist`).

## לפני העלאה (To-do)
- להוריד את תמונות הפרויקטים מה-CDN של Two Studio לתוך `public/assets/projects/` ולעדכן נתיבים ב-`projects.js` (כרגע הן מקושרות חיצונית).
- להחליף את הלוגו ב-`public/assets/logo.png` בקובץ הרשמי השקוף.
- להוסיף את העמודים הפנימיים: אודות, ייעוץ, פרויקטים (+עמוד לכל פרויקט), המלצות, צרו קשר.
