const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
// Simplified Gemini client handling.
// Prefer new SDK '@google/genai'; fallback to '@google/generative-ai'.
let useNewSdk = false;
let NewSdkClient = null; // GoogleGenAI
let OldSdkClient = null; // GoogleGenerativeAI
try {
  const { GoogleGenAI } = require('@google/genai');
  NewSdkClient = GoogleGenAI;
  useNewSdk = true;
} catch (_) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  OldSdkClient = GoogleGenerativeAI;
}

let cachedModelsList = null;
let cachedModelName = null;

async function chooseModel(apiKey) {
  if (cachedModelName) return cachedModelName;
  const order = [
    'gemini-2.0-flash-exp', // seen quota metrics for this model already
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-pro',
  ];
  if (useNewSdk) {
    try {
      const ai = new NewSdkClient({ apiKey });
      const listed = await ai.models.list();
      cachedModelsList = (listed.models || []).map(m => m.name);
      const found = order.find(m => cachedModelsList.includes(m));
      cachedModelName = found || order[0];
      return cachedModelName;
    } catch (err) {
      // listing failed -> fallback first in order
      cachedModelsList = [];
      cachedModelName = order[0];
      return cachedModelName;
    }
  } else {
    // old SDK cannot list easily; choose first expected working model
    cachedModelName = order[0];
    return cachedModelName;
  }
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing GEMINI_API_KEY in environment');
  const modelName = await chooseModel(apiKey);

  try {
    if (useNewSdk) {
      const ai = new NewSdkClient({ apiKey });
      // New SDK simple form: contents can be string
      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: { temperature: 0.2, maxOutputTokens: 512 }
      });
      return response.text || '';
    } else {
      const ai = new OldSdkClient(apiKey);
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 512 }
      });
      return result.response.text();
    }
  } catch (err) {
    const msg = String(err.message || err);
    if (msg.includes('429')) throw new Error('QUOTA: ' + msg);
    if (msg.includes('404')) throw new Error('MODEL_NOT_FOUND: ' + msg);
    throw err;
  }
}

router.post('/suggest', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) return res.status(400).json({ error: 'Empty message' });

    // Lightweight parsing for simple filters (category/type and price like '>60k', '60k trở lên')
    const text = (message || '').toLowerCase();
    let typeFilter = null;
    if (text.match(/\bchậu\b|\bchau\b|\bchậu\s/)) typeFilter = 'pot';

    function parseNumberWithUnit(raw, unit){
      let n = parseFloat(raw.replace(',', '.')) || 0;
      if (!unit) return n;
      unit = (unit||'').toLowerCase();
      if (unit.startsWith('k')) return Math.round(n * 1000);
      if (unit.startsWith('m') || unit.includes('tri') || unit.includes('tr')) return Math.round(n * 1000000);
      return n;
    }

    let minPrice = null, maxPrice = null;
    // patterns: '>60k', '>=60k', 'dưới 200k', 'trên 60k', '60k trở lên'
    const greater = text.match(/(?:>=|>|lớn hơn|trên|trở lên|từ)\s*([0-9]+(?:[.,][0-9]+)?)\s*(k|km|m|tr|triệu|tr)?/i);
    const less = text.match(/(?:<=|<|nhỏ hơn|dưới|ít hơn)\s*([0-9]+(?:[.,][0-9]+)?)\s*(k|km|m|tr|triệu|tr)?/i);
    const range = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(k|km|m|tr|triệu|tr)?\s*(?:-|to|\u2013|\u2014)\s*([0-9]+(?:[.,][0-9]+)?)\s*(k|km|m|tr|triệu|tr)?/i);
    const explicit = text.match(/([0-9]+(?:[.,][0-9]+)?)\s*(k|km|m|tr|triệu|tr)?/i);
    if (greater) {
      minPrice = parseNumberWithUnit(greater[1], greater[2]);
    }
    if (less) {
      maxPrice = parseNumberWithUnit(less[1], less[2]);
    }
    if (range) {
      minPrice = parseNumberWithUnit(range[1], range[2]);
      maxPrice = parseNumberWithUnit(range[3], range[4]);
    }
    // if user only typed a single number with unit and also used words like 'trở lên' we'll catch it via 'greater' above

    // Build MongoDB query using parsed filters
    let baseQuery = {};
    if (typeFilter) baseQuery.type = typeFilter;
    if (minPrice !== null || maxPrice !== null) baseQuery.price = {};
    if (minPrice !== null) baseQuery.price.$gte = minPrice;
    if (maxPrice !== null) baseQuery.price.$lte = maxPrice;

    // quick candidate selection from MongoDB
    let candidates = [];
    try {
      // if there's meaningful text beyond the simple filters, use text search joined with filters
      const useTextSearch = (message.replace(/[^\p{L}\p{N}]/gu, '').trim().length > 2);
      if (useTextSearch) {
        const q = Object.assign({}, baseQuery, { $text: { $search: message } });
        candidates = await Product.find(q).limit(8).select('name price slug tags description inStock img type').lean();
      }
    } catch (e) {
      // fallback to no-text query
      console.error('Text search failed, falling back to non-text query', e.message);
    }

    if (!candidates.length) {
      // try with filters only
      const q = Object.keys(baseQuery).length ? baseQuery : {};
      candidates = await Product.find(q).limit(8).select('name price slug tags description inStock img type').lean();
    }

    const productLines = candidates.map(p => {
      return `ID:${p._id} | NAME:${p.name} | PRICE:${p.price} | TYPE:${p.type || ''} | STOCK:${p.inStock} | TAGS:${(p.tags||[]).slice(0,5).join(',')} | DESC:${(p.description||'').slice(0,120)}`;
    }).join('\n');

    const systemPrompt = `You are a helpful product suggestion assistant for a Vietnamese plant shop.\nGiven a user's request and a short candidate product list, return a JSON object (ONLY JSON) with fields:\n- suggestions: array of { id, name, price, reason } (max 5)\n- ask: optional string if you need clarifying question (or empty)\n- filters: optional key-value map to apply in DB (like { priceMax, type, light })\n- confidence: number 0..1\n\nUser request: """${message}"""\nCandidates:\n${productLines}\n\nReturn ONLY strict JSON (no extra commentary).`;

    // Helper: build structured suggestions (used for mock or enhanced fallback)
    function buildMockAISuggestions(list) {
      return list.slice(0,5).map(p => {
        const reasons = [];
        if (typeFilter === 'pot') reasons.push('Thuộc loại chậu, đúng yêu cầu');
        if (minPrice) reasons.push(`Giá ≥ ${minPrice.toLocaleString('vi-VN')}đ`);
        if (maxPrice) reasons.push(`Giá ≤ ${maxPrice.toLocaleString('vi-VN')}đ`);
        if (!reasons.length) reasons.push('Phù hợp với truy vấn tổng quát');
        const firstImg = (Array.isArray(p.img) && p.img.length > 0) ? p.img[0] : '/images/default-plant.jpg';
        return { id: p._id, name: p.name, price: p.price, slug: p.slug, img: firstImg, reason: reasons.join(' · ') };
      });
    }

    // Force mock path (demo/presentation) if env variable set
    if (process.env.FORCE_CHATBOT_MOCK === 'true') {
      const mockSuggestions = buildMockAISuggestions(candidates);
      return res.json({ suggestions: mockSuggestions, mock: true, forced: true });
    }

    let raw;
    try {
      raw = await callGemini(systemPrompt);
    } catch (err) {
      const tag = err.message.startsWith('QUOTA:') ? 'quota' : (err.message.startsWith('MODEL_NOT_FOUND:') ? 'model' : 'other');
      console.error('Gemini call failed:', err.message);
      if (tag === 'quota') {
        const mockSuggestions = buildMockAISuggestions(candidates);
        return res.json({ suggestions: mockSuggestions, mock: true, error: err.message, errorType: tag, modelTried: cachedModelName });
      }
      // Enhanced fallback (still structured reasons if filters exist)
      const fallback = buildMockAISuggestions(candidates);
      return res.json({ suggestions: fallback, fallback: true, error: err.message, errorType: tag, modelTried: cachedModelName });
    }

    // try to parse JSON from response (strip non-json if necessary)
    let json;
    try {
      json = JSON.parse(raw);
    } catch (err) {
      // best-effort: try to extract JSON substring
      const start = raw.indexOf('{');
      const end = raw.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        try { json = JSON.parse(raw.slice(start, end + 1)); } catch (e) { json = null; }
      }
    }

    if (!json) return res.json({ raw, candidates });

    const suggestions = (json.suggestions || []).map(s => {
      const prod = candidates.find(p => p._id.toString() === s.id.toString());
      const firstImg = prod && Array.isArray(prod.img) && prod.img.length > 0 ? prod.img[0] : '/images/default-plant.jpg';
      return {
        id: s.id,
        name: prod ? prod.name : s.name,
        price: prod ? prod.price : s.price,
        slug: prod ? prod.slug : null,
        img: firstImg,
        reason: s.reason,
      };
    });

    return res.json({ suggestions, ask: json.ask, filters: json.filters, confidence: json.confidence });
  } catch (err) {
    console.error('Chatbot error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

// Debug route to inspect selected model & list (not documented in UI)
router.get('/models/debug', async (_req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY || null;
    if (apiKey && !cachedModelName) await chooseModel(apiKey);
    res.json({
      sdk: useNewSdk ? '@google/genai' : '@google/generative-ai',
      chosen: cachedModelName,
      listed: cachedModelsList,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
