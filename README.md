# Investiční kalkulačka

React kalkulačka pro modelování růstu investic v čase – nominální i reálná hodnota, valorizace vkladů, vliv inflace. Druhý režim počítá potřebný měsíční vklad pro dosažení cílové částky.

## Lokální spuštění

```bash
npm install
npm run dev
```

Otevři `http://localhost:5173/`.

## Build

```bash
npm run build
```

Vytvoří se složka `dist/` s produkční verzí.

---

## Nasazení na Netlify

### A) Drag & drop (nejrychlejší, bez Gitu)

1. `npm run build`
2. Jdi na https://app.netlify.com/drop
3. Přetáhni složku `dist/` do okna prohlížeče
4. Hotovo – dostaneš veřejnou URL

Pro každou další verzi musíš znovu zbuildovat a přetáhnout. Pokud chceš vlastní doménu nebo přejmenovat site, klikni v Netlify na Site settings.

### B) GitHub + Netlify auto-deploy (doporučeno pro vývoj)

Při tomto postupu Netlify automaticky znovu buildne a nasadí web pokaždé, když pushneš commit na `main` branch. Žádné drag & drop už nepotřebuješ.

**Krok 1 – Vytvoř GitHub repo**

1. Jdi na https://github.com/new
2. Pojmenuj repo (např. `investicni-kalkulacka`), nastav Private nebo Public
3. **Neinicializuj** s README ani .gitignore (oboje už v projektu máš)

**Krok 2 – Pushni projekt**

V terminálu, ve složce projektu:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TVOJE_JMENO/investicni-kalkulacka.git
git push -u origin main
```

**Krok 3 – Propoj s Netlify**

1. Na https://app.netlify.com klikni **Add new site → Import an existing project**
2. Vyber **GitHub**, autorizuj přístup
3. Najdi repo `investicni-kalkulacka`
4. Build settings se vyplní automaticky z `netlify.toml`:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Klikni **Deploy site**

První build trvá ~1–2 minuty. Dostaneš URL typu `nahodne-jmeno-12345.netlify.app`.

**Krok 4 – Změna webu = jeden push**

```bash
# uprav kód v editoru
git add .
git commit -m "Změnil jsem výnos sliderem na max 20%"
git push
```

Netlify do ~1 minuty zveřejní novou verzi.

**Krok 5 (volitelné) – Custom doména**

Site settings → Domain management → Add custom domain. Pokud máš doménu jinde, stačí v DNS přidat CNAME na `tvuj-site.netlify.app`.

---

## Struktura projektu

```
investicni-kalkulacka/
├── index.html              # HTML shell
├── package.json            # závislosti
├── vite.config.js          # Vite konfigurace
├── netlify.toml            # Netlify build settings
├── .gitignore
└── src/
    ├── main.jsx                 # React entry point
    └── InvestmentCalculator.jsx # Hlavní komponenta (vše uvnitř)
```

Veškeré styly a logika jsou v `InvestmentCalculator.jsx` – jeden soubor, žádný Tailwind, žádný CSS framework. Stačí mít `react`, `react-dom`, `recharts`.

## Tipy pro úpravy

- **Změna obsahu/textů** – stačí editovat JSX v `InvestmentCalculator.jsx`
- **Změna barev** – hledej hex kódy (`#D97757`, `#BE5530`, `#1C1917`…) v `<style>` bloku a inline stylech
- **Přidání nového slideru** – zkopíruj jakýkoli `<PremiumSlider>` v sekci `growthInputs` nebo `goalInputs`
- **Přidání nové stat karty** – přidej `<StatCard>` do `.ms-stats-grid`

Pokud chceš stránku přejmenovat na něco jiného (např. *Retirement kalkulačka*, *Hypotéka vs. investice*), stačí v `index.html` upravit `<title>` a v komponentě nadpis `<h1>`. Stylový systém zůstává stejný.
