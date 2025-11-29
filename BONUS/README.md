# BONUS FEATURES & EVIDENCE

List and document all extra (optional) features claimed for additional points.
Replace placeholder sections with real descriptions + screenshots.

## 1. AI Chatbot (Gemini Integration)
- Description: Product assistant that suggests items based on user questions.
- Endpoint: `/api/chatbot` (POST)
- Tech: Gemini API, semantic search fallback.
- Evidence:
  - Screenshot: `screenshots/chatbot-endpoint.png`
  - Screenshot: `screenshots/chatbot-ui.png`
  - Notes: Works with ENV `GEMINI_API_KEY`.

## 2. Realtime Comments & Ratings
- Description: Product detail page receives new comments & rating updates without refresh via Socket.io.
- Evidence:
  - Screenshot: `screenshots/realtime-two-browsers.png`
  - Demo timestamp(s) in video.

## 3. Advanced Admin Dashboard
- Description: KPI metrics, charts, order trends, product mix.
- Evidence:
  - Screenshot: `screenshots/admin-dashboard-kpis.png`
  - Screenshot: `screenshots/admin-dashboard-charts.png`

## 4. Data Seeding & Normalization Scripts
- Description: Automated initial data load + post-load normalization.
- Files: `helpers/seed*.js`, function `normalizeProductTypes()` in `app.js`.
- Evidence:
  - Screenshot: `screenshots/seed-output.png`

## 5. Loyalty / Reward Placeholder (If Implemented)
- Description: Points earned per order; redeem for discounts.
- Evidence:
  - Screenshot: `screenshots/loyalty-points.png`
  - If partial: mark clearly and adjust rubric self-score.

## 6. Image Repair Script
- Description: `scripts/repair_product_images.js` sanitizes and organizes product image references.
- Evidence:
  - Screenshot: `screenshots/image-repair-before-after.png`

## 7. Any Additional Feature
- Title: <Your Extra Feature>
- Description: <Explain business value>
- Tech Stack: <List>
- Evidence: <Screenshots / logs / code references>

---
### PROVIDING EVIDENCE
- Use `BONUS/screenshots/` folder for all PNG/JPG.
- Name files descriptively.
- Reference each screenshot explicitly in this README.
- Ensure each claimed feature appears clearly in `demo.mp4`.

### CLAIM FORMAT
For each feature, optionally add:
```
Self-Assessment: FULL / PARTIAL / DEMO ONLY
Complexity Level: Low / Medium / High
Reason for Points: <short justification>
```

### NOTES
- Only list features not covered by the base rubric.
- Remove any section not claimed to avoid confusion.
- Keep this file concise—evaluators prefer clarity over length.

END
