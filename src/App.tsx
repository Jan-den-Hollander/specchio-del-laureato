/**
 * Specchio delle Fate / Magische Spiegel — v11b
 * Fixes t.o.v. v11:
 *  - TTS afkap fix: 250ms marge na onended + src.start(0)
 *  - Gemini model fallback: 2.5-flash → 2.0-flash (tekst + TTS)
 *  - Fallback boodschap altijd aanwezig bij API storing
 */
import { useState, useRef, useEffect } from 'react';
import { Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── API sleutel ───────────────────────────────────────────────────────────
const ENV_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEMINI_KEY) || '';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ── Taal config ───────────────────────────────────────────────────────────
const LANG = {
  it: {
    code: 'it',
    label: '🇮🇹 Italiano',
    speechLang: 'it-IT',
    title: 'Lo Specchio delle Fate',
    subtitle: '✦   ✦   ✦',
    chooseLabel: 'Scegli la tua lingua',
    qName: 'Sono lo Specchio delle Fate.\nCome ti chiami?',
    qNameSub: 'Sono la Fata dello Specchio. Come ti chiami?',
    qDate: (n) => `Che bello conoscerti, ${n}! Quando sei nato?`,
    qDateSub: 'Quando sei nato/a?',
    namePlaceholder: 'Scrivi il tuo nome...',
    datePlaceholder: '4 aprile · 15-04',
    dateHint: 'Es: 4 aprile · aprile 4 · 15-04',
    btnNext: 'Avanti ✨',
    btnShow: 'Mostra il mio messaggio 🪄',
    btnNextChild: '✨ Prossimo bambino ✨',
    btnNextHint: 'Tocca qui quando tocca a un altro bambino',
    thinking: 'Lo specchio sta pensando... ✨',
    noKey: 'Nessuna chiave API impostata 🔑',
    badDate: "Non capisco la data. Di' per es. 4 aprile o 15-04 ✨",
    noName: 'Dimmi prima come ti chiami! 🌟',
    notHeard: 'Non ho capito bene 🌟',
    micError: 'Il microfono non funziona in questo browser 🎤',
    listening: 'Sto ascoltando... 👂',
    fallbackNote: '✦ Lo specchio parla dalla sua memoria magica ✦',
    bannerToday: '🎂 Oggi è il tuo grande giorno!',
    bannerSoon: (d) => `⏳ Ancora ${d} giorno${d===1?'':'i'} al tuo compleanno!`,
    bannerPast: (d) => `🎉 Auguri! ${Math.abs(d)} giorno${Math.abs(d)===1?'':'i'} fa era il tuo giorno speciale!`,
    factHeader: '✦ Nel tuo giorno di nascita, in passato ✦',
    keyTitle: '🔑 Chiave API',
    keyHint: 'Inserisci la chiave API Gemini.\nVerrà salvata solo su questo dispositivo.',
    keyPlaceholder: 'AIza...',
    keyCancel: 'Annulla',
    keySave: 'Salva',
    keyBtn: (has) => has ? 'Chiave API ✓' : 'Imposta chiave API',
    emoji: { name: '🧚🪄', date: '🎂' },
    promptSystem: `Sei lo Specchio delle Fate in un bosco incantato. Parla in modo caldo, gioioso e adatto ai bambini. Rispondi SOLO in JSON senza markdown.`,
    buildPrompt: (name, day, month, daysUntil) => {
      const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
        'luglio','agosto','settembre','ottobre','novembre','dicembre'];
      const mese = mesi[month - 1];
      let timing = '';
      if (daysUntil === 0) timing = 'OGGI è il compleanno!';
      else if (daysUntil > 0 && daysUntil <= 7) timing = `Tra ${daysUntil} giorno${daysUntil===1?'':'i'} è il compleanno.`;
      else if (daysUntil < 0 && daysUntil >= -7) timing = `Il compleanno era ${Math.abs(daysUntil)} giorno${Math.abs(daysUntil)===1?'':'i'} fa.`;
      return `Bambino: ${name} | Compleanno: ${day} ${mese} | ${timing}

Dai un messaggio di compleanno personale (max 3 frasi) e esattamente 2 o 3 fatti storici reali del ${day} ${mese} che i bambini trovano interessanti (artisti, animali, giocattoli, parchi divertimento, cartoni animati, invenzioni).

Rispondi SOLO come JSON senza markdown:
{"it":"...","facts":[{"year":1984,"it":"..."}]}`;
    },
  },
  nl: {
    code: 'nl',
    label: '🇳🇱 Nederlands',
    speechLang: 'nl-NL',
    title: 'Magische Spiegel',
    subtitle: '✦   ✦   ✦',
    chooseLabel: 'Kies je taal',
    qName: 'Ik ben de Magische Spiegel.\nHoe heet jij?',
    qNameSub: 'Ik ben de Feeënspiegel. Hoe heet jij?',
    qDate: (n) => `Fijn om je te ontmoeten, ${n}! Wanneer ben jij geboren?`,
    qDateSub: 'Wanneer ben jij geboren?',
    namePlaceholder: 'Typ je naam...',
    datePlaceholder: '4 april · 15-04',
    dateHint: 'Bijv: 4 april · april 4 · 15-04',
    btnNext: 'Verder ✨',
    btnShow: 'Toon mijn boodschap 🪄',
    btnNextChild: '✨ Volgend kind ✨',
    btnNextHint: 'Tik hier als een ander kind aan de beurt is',
    thinking: 'De spiegel denkt na... ✨',
    noKey: 'Geen API sleutel ingesteld 🔑',
    badDate: 'Ik begrijp de datum niet. Zeg bijv. 4 april of 15-04 ✨',
    noName: 'Vertel mij eerst hoe je heet! 🌟',
    notHeard: 'Niet goed gehoord 🌟',
    micError: 'Microfoon werkt niet in deze browser 🎤',
    listening: 'Ik luister... 👂',
    fallbackNote: '✦ De spiegel spreekt vanuit haar eigen magische geheugen ✦',
    bannerToday: '🎂 Vandaag is jouw grote dag!',
    bannerSoon: (d) => `⏳ Nog ${d} dag${d===1?'':'en'} tot jouw verjaardag!`,
    bannerPast: (d) => `🎉 Gefeliciteerd! ${Math.abs(d)} dag${Math.abs(d)===1?'':'en'} geleden!`,
    factHeader: '✦ Op jouw verjaardag in het verleden ✦',
    keyTitle: '🔑 API Sleutel',
    keyHint: 'Voer de Gemini API sleutel in.\nWordt alleen op dit apparaat opgeslagen.',
    keyPlaceholder: 'AIza...',
    keyCancel: 'Annuleer',
    keySave: 'Opslaan',
    keyBtn: (has) => has ? 'API sleutel ✓' : 'API sleutel instellen',
    emoji: { name: '🧚🪄', date: '🎂' },
    promptSystem: `Je bent de Magische Spiegel in een betoverd sprookjesbos. Spreek warm, vrolijk en kindvriendelijk. Antwoord ALLEEN als JSON zonder markdown.`,
    buildPrompt: (name, day, month, daysUntil) => {
      const maanden = ['januari','februari','maart','april','mei','juni',
        'juli','augustus','september','oktober','november','december'];
      const maand = maanden[month - 1];
      let timing = '';
      if (daysUntil === 0) timing = 'VANDAAG is de verjaardag!';
      else if (daysUntil > 0 && daysUntil <= 7) timing = `Over ${daysUntil} dag${daysUntil===1?'':'en'} is de verjaardag.`;
      else if (daysUntil < 0 && daysUntil >= -7) timing = `De verjaardag was ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden.`;
      return `Kind: ${name} | Verjaardag: ${day} ${maand} | ${timing}

Geef een persoonlijke verjaardagsboodschap (max 3 zinnen) én precies 2 of 3 echte historische feitjes van ${day} ${maand} die kinderen leuk vinden (artiesten, dieren, speelgoed, pretparken, tekenfilms, uitvindingen).

Antwoord ALLEEN als JSON zonder markdown:
{"nl":"...","facts":[{"year":1984,"nl":"..."}]}`;
    },
  },
};

const STEP = { LANG: 'lang', NAME: 'name', DATE: 'date', DONE: 'done' };

// ── Retry helper ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

async function fetchWithRetry(fn, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
      ]);
    } catch (err) {
      const isLast = attempt === maxAttempts;
      const isRetryable = ['timeout','503','overloaded','network'].some(s => err?.message?.includes(s));
      if (isLast || !isRetryable) throw err;
      await sleep(attempt * 1500);
    }
  }
}

// ── Gemini TTS met model-fallback + afkap fix ─────────────────────────────
async function geminiTTS(text, apiKey, langCode = 'it') {
  const voiceName = 'Aoede';
  let lastErr;
  for (const model of ['gemini-2.5-flash-preview-tts', 'gemini-2.0-flash-preview-tts']) {
    try {
      const resp = await fetch(
        `${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text }] }],
            generationConfig: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName } },
              },
            },
          }),
        }
      );
      if (!resp.ok) throw new Error('TTS ' + resp.status);
      const data = await resp.json();
      const b64 = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error('No audio data');

      const raw = atob(b64);
      const bytes = new Uint8Array(raw.length);
      for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
      const ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
      const int16 = new Int16Array(bytes.buffer);
      const float32 = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;
      const buf = ctx.createBuffer(1, float32.length, 24000);
      buf.copyToChannel(float32, 0);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      return new Promise((resolve, reject) => {
        // 250ms marge zodat laatste lettergreep niet wordt afgeknipt
        src.onended = () => { setTimeout(() => { ctx.close(); resolve(); }, 250); };
        src.onerror = (e) => { ctx.close(); reject(e); };
        src.start(0);
      });
    } catch (err) {
      lastErr = err;
      // probeer volgend TTS model
    }
  }
  throw lastErr;
}

// ── Browser TTS fallback ──────────────────────────────────────────────────
const getVoices = () => new Promise(resolve => {
  const v = window.speechSynthesis.getVoices();
  if (v.length) { resolve(v); return; }
  window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
  setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
});

async function browserSpeak(text, langCode = 'it', onEnd = () => {}) {
  if (!text) { onEnd(); return; }
  window.speechSynthesis.cancel();
  const voices = await getVoices();
  const pick = voices.find(v => v.lang.startsWith(langCode) && /female|woman|femme/i.test(v.name))
    || voices.find(v => v.lang.startsWith(langCode))
    || voices[0];
  const utt = new SpeechSynthesisUtterance(text);
  if (pick) utt.voice = pick;
  utt.lang = { it: 'it-IT', nl: 'nl-NL' }[langCode] || 'it-IT';
  utt.rate = 0.88; utt.pitch = 1.1;
  utt.onend = onEnd; utt.onerror = onEnd;
  window.speechSynthesis.speak(utt);
}

async function speakText(text, langCode, apiKey, onStart = () => {}, onEnd = () => {}) {
  if (!text) { onEnd(); return; }
  onStart();
  if (apiKey) {
    try {
      await geminiTTS(text, apiKey, langCode);
      onEnd();
      return;
    } catch { /* val terug op browser */ }
  }
  browserSpeak(text, langCode, onEnd);
}

async function speakAll(boodschap, facts, langCode, apiKey, factKey, onStart, onEnd) {
  const feitjesTekst = facts.length > 0
    ? (langCode === 'it'
        ? 'E sapevi che nel tuo giorno di nascita sono successe cose speciali? '
          + facts.map(f => `Nell\'anno ${f.year}: ${f.it || f.nl}`).join('. ') + '.'
        : 'En wist je dat er op jouw verjaardag ook bijzondere dingen zijn gebeurd? '
          + facts.map(f => `In het jaar ${f.year}: ${f.nl || f.it}`).join('. ') + '.')
    : '';
  const full = feitjesTekst ? `${boodschap} ${feitjesTekst}` : boodschap;
  await speakText(full, langCode, apiKey, onStart, onEnd);
}

// ── Fallback boodschappen ─────────────────────────────────────────────────
function buildFallback(name, day, month, daysUntil, lang) {
  const mesi = {
    it: ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'],
    nl: ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'],
  };
  const mese = mesi[lang][month - 1];

  let begroeting = '';
  if (daysUntil === 0) {
    begroeting = lang === 'it'
      ? `Oggi è il tuo grande giorno, ${name}! Il mondo intero è felice che tu ci sia! 🎉`
      : `Vandaag is jouw grote dag, ${name}! De hele wereld is blij dat jij er bent! 🎉`;
  } else if (daysUntil > 0 && daysUntil <= 7) {
    begroeting = lang === 'it'
      ? `Ancora solo ${daysUntil} giorno${daysUntil===1?'':'i'}, ${name}! Il tuo compleanno sta arrivando! 🎈`
      : `Nog maar ${daysUntil} dag${daysUntil===1?'':'en'} te gaan, ${name}! Jouw verjaardag komt er heel snel aan! 🎈`;
  } else if (daysUntil < 0 && daysUntil >= -7) {
    begroeting = lang === 'it'
      ? `Auguri, ${name}! Il tuo giorno speciale era ${Math.abs(daysUntil)} giorno${Math.abs(daysUntil)===1?'':'i'} fa. Spero che tu stia ancora festeggiando! 🎂`
      : `Gefeliciteerd, ${name}! ${Math.abs(daysUntil)} dag${Math.abs(daysUntil)===1?'':'en'} geleden was jouw bijzondere dag. Ik hoop dat je er nog steeds van geniet! 🎂`;
  } else {
    begroeting = lang === 'it'
      ? `Che meraviglia essere nata il ${day} ${mese}, ${name}! È un giorno davvero magico! 🌟`
      : `Wat bijzonder dat jij op ${day} ${mese} geboren bent, ${name}! Dat is een heel magische dag! 🌟`;
  }

  const testo = lang === 'it'
    ? `${begroeting} Lo Specchio delle Fate sa che sei una persona molto speciale, perché nel tuo giorno di nascita c'è sempre un po' di magia nell'aria. Chiudi gli occhi ed esprimi un desiderio — a volte si avverano davvero! ✨`
    : `${begroeting} De Magische Spiegel weet zeker dat jij een heel speciaal iemand bent, want op jouw verjaardag schijnt er altijd een beetje extra magie in de lucht. Sluit je ogen en maak een wens — soms komen die echt uit! ✨`;

  const seizoen = [12,1,2].includes(month) ? 'winter'
    : [3,4,5].includes(month) ? 'lente'
    : [6,7,8].includes(month) ? 'zomer' : 'herfst';

  const feitjes = {
    winter: [
      { year: 1812, it: 'I fratelli Grimm scrissero il loro primo libro di fiabe magiche per bambini.', nl: 'Schreven de gebroeders Grimm hun eerste sprookjesboek vol magische verhalen.' },
      { year: 1955, it: 'Aprì il primo Disneyland: un parco magico pieno di sogni.', nl: 'Opende het eerste Disneyland zijn poorten, een echt sprookjespark vol dromen.' },
    ],
    lente: [
      { year: 1937, it: "Biancaneve fu il primo film d'animazione lungo della storia.", nl: 'Was Sneeuwwitje de eerste lange animatiefilm ooit.' },
      { year: 1989, it: 'La Sirenetta nuotò per la prima volta sullo schermo grande.', nl: 'Zwom de Kleine Zeemeermin voor het eerst op het witte doek.' },
    ],
    zomer: [
      { year: 1865, it: 'Alice cadde nella tana del coniglio e arrivò nel Paese delle Meraviglie.', nl: 'Dook Alice voor het eerst in het konijnenhol en belandde in Wonderland.' },
      { year: 1997, it: 'Harry Potter salì per la prima volta sulla sua scopa e volò verso Hogwarts.', nl: 'Besteeg Harry Potter voor het eerst zijn bezem en vloog naar Zweinstein.' },
    ],
    herfst: [
      { year: 1928, it: "Topolino fece il suo primo squittio: l'inizio di un mondo magico di cartoni animati.", nl: 'Piepte Mickey Mouse voor het eerst, het begin van een magische wereld vol tekenfilms.' },
      { year: 1952, it: 'Pippi Calzelunghe apparve per la prima volta in televisione.', nl: 'Verscheen Pippi Langkous voor het eerst op televisie.' },
    ],
  };

  return { [lang]: testo, facts: feitjes[seizoen], _isFallback: true };
}

// ── OrnateFrame SVG ───────────────────────────────────────────────────────
function ptOnEllipse(cx, cy, rx, ry, angleDeg) {
  const a = (angleDeg - 90) * Math.PI / 180;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
}

function OrnateFrame({ W = 270, H = 330 }) {
  const cx = W / 2, cy = H / 2;
  const rx = cx - 10, ry = cy - 10;

  const kransPunten = [
    { a:  0, emoji:'🌹', fs:22, off: 14, rot:  0 },
    { a: 14, emoji:'🍀', fs:15, off:  4, rot: 20 },
    { a: 25, emoji:'🌱', fs:13, off: -2, rot: 35 },
    { a: 37, emoji:'🥀', fs:17, off:  8, rot: 50 },
    { a: 50, emoji:'🍀', fs:14, off:  2, rot: 65 },
    { a: 63, emoji:'🌸', fs:20, off: 12, rot: 80 },
    { a: 76, emoji:'🌱', fs:12, off: -4, rot: 95 },
    { a: 87, emoji:'🍀', fs:15, off:  5, rot:110 },
    { a: 99, emoji:'🌹', fs:19, off: 11, rot:125 },
    { a:111, emoji:'🌱', fs:12, off: -3, rot:140 },
    { a:122, emoji:'🍀', fs:16, off:  6, rot:155 },
    { a:134, emoji:'🥀', fs:18, off: 13, rot:170 },
    { a:146, emoji:'🌱', fs:13, off: -2, rot:185 },
    { a:157, emoji:'🌸', fs:20, off: 14, rot:200 },
    { a:169, emoji:'🍀', fs:14, off:  3, rot:215 },
    { a:180, emoji:'🌹', fs:21, off: 14, rot:180 },
    { a:192, emoji:'🌱', fs:12, off: -4, rot:245 },
    { a:204, emoji:'🍀', fs:15, off:  5, rot:260 },
    { a:216, emoji:'🥀', fs:18, off: 12, rot:200 },
    { a:228, emoji:'🌱', fs:12, off: -3, rot:290 },
    { a:239, emoji:'🌸', fs:21, off: 15, rot:185 },
    { a:251, emoji:'🍀', fs:14, off:  4, rot:320 },
    { a:263, emoji:'🌹', fs:19, off: 12, rot:195 },
    { a:274, emoji:'🌱', fs:12, off: -4, rot:350 },
    { a:286, emoji:'🍀', fs:15, off:  5, rot: 10 },
    { a:298, emoji:'🌸', fs:20, off: 13, rot: 25 },
    { a:309, emoji:'🌱', fs:12, off: -2, rot: 40 },
    { a:320, emoji:'🥀', fs:17, off:  9, rot: 55 },
    { a:332, emoji:'🍀', fs:14, off:  3, rot: 70 },
    { a:344, emoji:'🌹', fs:20, off: 13, rot: -5 },
    { a:356, emoji:'🌱', fs:12, off: -3, rot: 10 },
  ];

  return (
    <svg width={W} height={H} viewBox={'0 0 ' + W + ' ' + H}
      style={{ position:'absolute', inset:0, pointerEvents:'none', zIndex:2 }}>
      <defs>
        <linearGradient id="gG1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fff0a0"/>
          <stop offset="25%"  stopColor="#d4a017"/>
          <stop offset="55%"  stopColor="#b8860b"/>
          <stop offset="80%"  stopColor="#f0c040"/>
          <stop offset="100%" stopColor="#8B6914"/>
        </linearGradient>
        <linearGradient id="gG2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"   stopColor="#ffe566"/>
          <stop offset="50%"  stopColor="#c49a0c"/>
          <stop offset="100%" stopColor="#f5e642"/>
        </linearGradient>
        <filter id="gGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feComposite in="SourceGraphic" in2="b" operator="over"/>
        </filter>
        <filter id="emojiShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0a1a04" floodOpacity="0.55"/>
        </filter>
        <filter id="roseShadow" x="-40%" y="-40%" width="180%" height="180%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#200010" floodOpacity="0.5"/>
        </filter>
      </defs>

      {(() => {
        const pts = Array.from({ length: 73 }, (_, i) => {
          const angle = i * 5;
          const wave = Math.sin(i * 0.9) * 6;
          const [x, y] = ptOnEllipse(cx, cy, rx + wave, ry + wave, angle);
          return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
        });
        return (
          <>
            <path d={pts.join(' ') + 'Z'} fill="none" stroke="#18420a" strokeWidth="5" opacity="0.6"/>
            <path d={pts.join(' ') + 'Z'} fill="none" stroke="#3d8e1e" strokeWidth="3" opacity="0.85"/>
            <path d={pts.join(' ') + 'Z'} fill="none" stroke="#7acc40" strokeWidth="1.2" opacity="0.28" strokeDasharray="3 9"/>
          </>
        );
      })()}

      <ellipse cx={cx} cy={cy} rx={rx}    ry={ry}    fill="none" stroke="url(#gG1)" strokeWidth="5.5"/>
      <ellipse cx={cx} cy={cy} rx={rx-8}  ry={ry-8}  fill="none" stroke="url(#gG2)" strokeWidth="1.6" opacity="0.6"/>
      <ellipse cx={cx} cy={cy} rx={rx-13} ry={ry-13} fill="none" stroke="#f5e642"   strokeWidth="0.5" opacity="0.18"/>

      {kransPunten.filter(p => ['🌱','🍀'].includes(p.emoji)).map((p, i) => {
        const [px, py] = ptOnEllipse(cx, cy, rx + p.off, ry + p.off, p.a);
        return <text key={'g'+i} x={px} y={py} fontSize={p.fs} textAnchor="middle" dominantBaseline="middle"
          transform={'rotate('+p.rot+','+px+','+py+')'} filter="url(#emojiShadow)" style={{ userSelect:'none' }}>{p.emoji}</text>;
      })}
      {kransPunten.filter(p => ['🌹','🥀','🌸'].includes(p.emoji)).map((p, i) => {
        const [px, py] = ptOnEllipse(cx, cy, rx + p.off, ry + p.off, p.a);
        return <text key={'f'+i} x={px} y={py} fontSize={p.fs} textAnchor="middle" dominantBaseline="middle"
          transform={'rotate('+p.rot+','+px+','+py+')'} filter="url(#roseShadow)" style={{ userSelect:'none' }}>{p.emoji}</text>;
      })}

      <circle cx={cx} cy={13} r={23} fill="url(#gG1)" filter="url(#gGlow)"/>
      <circle cx={cx} cy={13} r={19} fill="#100802"/>
      <circle cx={cx} cy={13} r={17} fill="url(#gG1)" opacity="0.08"/>
      <text x={cx} y={20} textAnchor="middle" fontSize="18" style={{ userSelect:'none' }}>🪞</text>
      <line x1={cx} y1={36} x2={cx} y2={cy-ry} stroke="url(#gG1)" strokeWidth="2.5" opacity="0.75"/>
      <circle cx={cx} cy={37} r={3.5} fill="url(#gG1)"/>
      <path d={'M'+(cx-42)+' '+(H-18)+' Q'+cx+' '+(H-4)+' '+(cx+42)+' '+(H-18)} fill="none" stroke="url(#gG1)" strokeWidth="2.5"/>
      <circle cx={cx} cy={H-4} r={5} fill="url(#gG1)"/>
      {[-24,24].map((dx,i) => <circle key={i} cx={cx+dx} cy={H-14} r={3} fill="#d4a017" opacity="0.72"/>)}
      {[[cx,cy-ry-18],[cx,cy+ry+12],[cx-rx-12,cy],[cx+rx+12,cy]].map(([ex,ey],i) => (
        <text key={'sp'+i} x={ex} y={ey} textAnchor="middle" dominantBaseline="middle" fontSize="10" opacity="0.55" style={{ userSelect:'none' }}>✨</text>
      ))}
    </svg>
  );
}

// ── Vuurvliegjes ──────────────────────────────────────────────────────────
const FIREFLIES = Array.from({ length: 16 }, (_, i) => ({
  id: i, x: Math.random()*100, y: Math.random()*100,
  delay: Math.random()*4, dur: 3 + Math.random()*3,
  dx: (Math.random()-0.5)*60, dy: (Math.random()-0.5)*40,
}));
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i, x: 10+Math.random()*80, y: 10+Math.random()*80,
  size: 4+Math.random()*7, delay: Math.random()*3, dur: 2+Math.random()*2,
  color: ['#f5e642','#fff8c0','#ffb347','#ff9de2','#a8edea'][i%5],
}));

// ── Taalkeuze overlay ─────────────────────────────────────────────────────
function LangOverlay({ onSelect }) {
  return (
    <motion.div key="lang"
      initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.92 }}
      style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'16px 18px', background:'rgba(14,7,28,0.94)',
        borderRadius:'50% 50% 47% 47%', zIndex:10, gap:14,
      }}
    >
      <div style={{ fontSize:28 }}>🪞</div>
      <p style={{ color:'#f5e642', fontSize:11, textAlign:'center', margin:0,
        fontFamily:"'IM Fell English', serif", letterSpacing:'0.1em',
        textShadow:'0 0 10px rgba(245,230,66,0.48)', lineHeight:1.7 }}>
        Scegli la lingua<br/>
        <span style={{ opacity:0.5, fontSize:10 }}>Kies je taal</span>
      </p>
      {Object.values(LANG).map(l => (
        <button key={l.code} onClick={() => onSelect(l.code)}
          style={{
            padding:'10px 28px', borderRadius:24, width:'80%',
            background:'linear-gradient(135deg,rgba(212,160,23,0.18),rgba(212,160,23,0.08))',
            border:'1.5px solid rgba(212,160,23,0.48)',
            color:'#f5e642', fontSize:15, cursor:'pointer',
            fontFamily:"'IM Fell English', serif", letterSpacing:'0.06em',
            transition:'all 0.18s',
          }}
          onMouseEnter={e => e.currentTarget.style.background='rgba(212,160,23,0.28)'}
          onMouseLeave={e => e.currentTarget.style.background='linear-gradient(135deg,rgba(212,160,23,0.18),rgba(212,160,23,0.08))'}
        >
          {l.label}
        </button>
      ))}
    </motion.div>
  );
}

// ── Setup overlay ─────────────────────────────────────────────────────────
function SetupOverlay({ step, lang, name, setName, birthInput, setBirthInput,
  onListen, isListening, listenTarget, onConfirm }) {
  const L = LANG[lang];
  const isName = step === STEP.NAME;

  return (
    <motion.div key={step}
      initial={{ opacity:0, scale:0.92 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.92 }}
      style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
        padding:'16px 18px', background:'rgba(14,7,28,0.94)',
        borderRadius:'50% 50% 47% 47%', zIndex:10, gap:10,
      }}
    >
      <div style={{ fontSize:26 }}>{isName ? L.emoji.name : L.emoji.date}</div>
      <p style={{ color:'#f5e642', fontSize:12, textAlign:'center', margin:0,
        lineHeight:1.55, fontFamily:"'IM Fell English', serif",
        textShadow:'0 0 10px rgba(245,230,66,0.48)', whiteSpace:'pre-line' }}>
        {isName ? L.qName : L.qDate(name)}
      </p>
      <input
        value={isName ? name : birthInput}
        onChange={e => isName ? setName(e.target.value) : setBirthInput(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onConfirm()}
        placeholder={isName ? L.namePlaceholder : L.datePlaceholder}
        inputMode={isName ? 'text' : 'numeric'}
        autoFocus
        style={{
          background:'rgba(245,230,66,0.07)',
          border:'1px solid rgba(245,230,66,0.38)',
          borderRadius:12, padding:'8px 12px',
          color:'#f5e642', fontSize:15, textAlign:'center',
          outline:'none', fontFamily:"'IM Fell English', serif", width:'85%',
        }}
      />
      <div style={{ display:'flex', gap:8, alignItems:'center' }}>
        <button onClick={() => onListen(step)} style={{
          width:40, height:40, borderRadius:'50%',
          background: isListening && listenTarget===step ? 'rgba(200,50,50,0.85)' : 'rgba(245,230,66,0.11)',
          border:'1.5px solid rgba(245,230,66,0.42)', cursor:'pointer', fontSize:17,
          display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s',
        }}>
          {isListening && listenTarget===step ? '🔴' : '🎤'}
        </button>
        <button onClick={onConfirm} style={{
          padding:'9px 20px', borderRadius:22,
          background:'linear-gradient(135deg,#d4a017,#f5e642)',
          border:'none', color:'#180c00', fontWeight:700, fontSize:13, cursor:'pointer',
          fontFamily:"'IM Fell English', serif",
          boxShadow:'0 2px 14px rgba(212,160,23,0.52)', letterSpacing:'0.04em',
        }}>
          {isName ? L.btnNext : L.btnShow}
        </button>
      </div>
      {!isName && (
        <p style={{ fontSize:9, color:'rgba(245,230,66,0.32)', margin:0, textAlign:'center' }}>
          {L.dateHint}
        </p>
      )}
    </motion.div>
  );
}

// ── Tekstballon ───────────────────────────────────────────────────────────
function SpeechBubble({ message, lang, onSpeak }) {
  if (!message) return null;
  const L = LANG[lang];
  const text = message[lang] || message.nl || message.it || '';
  const facts = message.facts || [];

  return (
    <motion.div
      initial={{ opacity:0, y:18, scale:0.95 }} animate={{ opacity:1, y:0, scale:1 }} exit={{ opacity:0, y:-8 }}
      style={{
        width:'100%',
        background:'linear-gradient(160deg,rgba(36,20,6,0.98),rgba(20,11,3,0.99))',
        border:'2px solid rgba(212,160,23,0.52)',
        borderRadius:18, padding:'13px 16px',
        boxShadow:'0 8px 28px rgba(0,0,0,0.65),0 0 18px rgba(212,160,23,0.07)',
        position:'relative',
      }}
    >
      <div style={{ position:'absolute', top:-12, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'9px solid transparent',
        borderRight:'9px solid transparent', borderBottom:'12px solid rgba(212,160,23,0.52)' }}/>
      <div style={{ position:'absolute', top:-9, left:'50%', transform:'translateX(-50%)',
        width:0, height:0, borderLeft:'7px solid transparent',
        borderRight:'7px solid transparent', borderBottom:'10px solid rgba(36,20,6,0.98)' }}/>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:8 }}>
        <button onClick={onSpeak} style={{ background:'none', border:'none', cursor:'pointer', fontSize:18, opacity:0.6, padding:'0 2px' }}>🔊</button>
      </div>

      <p style={{ margin:'0 0 10px', color:'#f5e642', lineHeight:1.7, fontSize:14,
        fontFamily:"'IM Fell English', serif", textShadow:'0 0 8px rgba(245,230,66,0.22)' }}>
        ✨ {text}
      </p>

      {facts.length > 0 && (
        <div style={{ borderTop:'1px solid rgba(212,160,23,0.16)', paddingTop:8, display:'flex', flexDirection:'column', gap:5 }}>
          <p style={{ margin:0, fontSize:9, color:'rgba(212,160,23,0.46)', letterSpacing:'0.14em', textTransform:'uppercase' }}>
            {L.factHeader}
          </p>
          {facts.map((f, i) => (
            <div key={i} style={{ background:'rgba(245,230,66,0.04)', border:'1px solid rgba(212,160,12,0.12)', borderRadius:9, padding:'5px 10px' }}>
              <span style={{ color:'#d4a017', fontSize:10, fontWeight:700 }}>{f.year} · </span>
              <span style={{ color:'rgba(245,230,66,0.7)', fontSize:11, fontStyle:'italic' }}>
                {f[lang] || f.nl || f.it}
              </span>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ── Datum parser ──────────────────────────────────────────────────────────
function parseBirthDate(input) {
  const raw = input.trim().toLowerCase();
  const MONTHS = {
    gennaio:1, gen:1, january:1, jan:1,
    febbraio:2, feb:2, february:2,
    marzo:3, mar:3, march:3, mrt:3, maart:3,
    aprile:4, apr:4, april:4,
    maggio:5, may:5, mei:5,
    giugno:6, giu:6, june:6, jun:6, juni:6,
    luglio:7, lug:7, july:7, jul:7, juli:7,
    agosto:8, ago:8, august:8, aug:8,
    settembre:9, set:9, sept:9, sep:9, september:9,
    ottobre:10, ott:10, october:10, oct:10, oktober:10, okt:10,
    novembre:11, nov:11, november:11,
    dicembre:12, dic:12, december:12, dec:12,
  };
  const mMatch = raw.match(/\b(gennaio|gen|febbraio|feb|marzo|mar|aprile|apr|maggio|giugno|giu|luglio|lug|agosto|ago|settembre|set|ottobre|ott|novembre|nov|dicembre|dic|january|february|march|april|may|june|july|august|september|sept?|october|december|januari|februari|maart|juni|juli|augustus|oktober)\b/);
  if (mMatch) {
    const month = MONTHS[mMatch[1]];
    const nums = raw.match(/\d+/g)?.map(Number) || [];
    const day = nums.find(n => n >= 1 && n <= 31);
    if (day && month) return { day, month };
  }
  const clean = raw.replace(/[\/\.\s]/g, '-');
  const parts = clean.split('-').map(p => parseInt(p, 10));
  if (parts.length >= 2) {
    const [a, b] = parts;
    if (a >= 1 && a <= 31 && b >= 1 && b <= 12) return { day:a, month:b };
    if (b >= 1 && b <= 31 && a >= 1 && a <= 12) return { day:b, month:a };
  }
  return null;
}

function computeDaysUntil(day, month) {
  const now = new Date(), y = now.getFullYear();
  let bd = new Date(y, month-1, day);
  const diff = Math.round((bd - now) / 86400000);
  if (diff > 180)  { bd = new Date(y-1, month-1, day); return Math.round((bd-now)/86400000); }
  if (diff < -180) { bd = new Date(y+1, month-1, day); return Math.round((bd-now)/86400000); }
  return diff;
}

// ── Hoofd component ───────────────────────────────────────────────────────
export default function MagischeSpiegel() {
  const [step, setStep]                 = useState(STEP.LANG);
  const [lang, setLang]                 = useState('it');
  const [name, setName]                 = useState('');
  const [birthInput, setBirthInput]     = useState('');
  const [message, setMessage]           = useState(null);
  const [status, setStatus]             = useState('');
  const [isListening, setIsListening]   = useState(false);
  const [listenTarget, setListenTarget] = useState(null);
  const [isThinking, setIsThinking]     = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [daysInfo, setDaysInfo]         = useState(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKey] = useState(() => {
    if (ENV_KEY) return ENV_KEY;
    try { return localStorage.getItem('magic_mirror_gemini_key') || ''; } catch { return ''; }
  });

  const videoRef  = useRef(null);
  const streamRef = useRef(null);
  const recRef    = useRef(null);

  // Camera
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'user' }, audio:false });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch { /* geen camera */ }
    })();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // Spreek de vraag voor bij elke stap
  useEffect(() => {
    if (step === STEP.LANG) return;
    let cancelled = false;
    const L = LANG[lang];
    const delay = setTimeout(() => {
      if (cancelled) return;
      const tekst = step === STEP.NAME ? L.qNameSub : L.qDate(name);
      speakText(tekst, lang, apiKey, () => setIsSpeaking(true), () => { if (!cancelled) setIsSpeaking(false); });
    }, 500);
    return () => { cancelled = true; clearTimeout(delay); window.speechSynthesis.cancel(); };
  }, [step, lang]);

  const L = LANG[lang];

  const selectLang = (code) => { setLang(code); setStep(STEP.NAME); };

  const confirmName = () => {
    if (!name.trim()) { setStatus(L.noName); return; }
    setStatus(''); setStep(STEP.DATE);
  };

  const confirmDate = () => {
    const parsed = parseBirthDate(birthInput);
    if (!parsed) { setStatus(L.badDate); return; }
    const days = computeDaysUntil(parsed.day, parsed.month);
    setDaysInfo(days); setStatus('');
    setStep(STEP.DONE);
    fetchMessage(name, parsed.day, parsed.month, days);
  };

  const startListening = (target) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setStatus(L.micError); return; }
    try { recRef.current?.stop(); } catch {}
    const rec = new SR();
    recRef.current = rec;
    rec.lang = L.speechLang; rec.continuous = false; rec.interimResults = false;
    rec.onstart  = () => { setIsListening(true);  setListenTarget(target); setStatus(L.listening); };
    rec.onend    = () => { setIsListening(false); setListenTarget(null);   setStatus(''); };
    rec.onerror  = () => { setIsListening(false); setListenTarget(null);   setStatus(L.notHeard); };
    rec.onresult = (e) => {
      const heard = e.results[0][0].transcript;
      if (target === STEP.NAME) setName(heard.replace(/[^a-zA-ZÀ-ÿ\s'-]/g, '').trim());
      else setBirthInput(heard);
    };
    rec.start();
  };

  // ── Gemini tekst API met model-fallback ───────────────────────────────
  const fetchMessage = async (n, day, month, days) => {
    if (!apiKey) { setStatus(L.noKey); return; }
    setIsThinking(true); setMessage(null); setStatus(L.thinking);

    try {
      let resp, lastTextErr;
      for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash']) {
        try {
          resp = await fetchWithRetry(() =>
            fetch(`${GEMINI_BASE}/models/${model}:generateContent?key=${apiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: L.buildPrompt(n, day, month, days) }] }],
                systemInstruction: { parts: [{ text: L.promptSystem }] },
                generationConfig: { temperature: 0.9, maxOutputTokens: 800 },
              }),
            }).then(r => r.json())
          );
          if (resp.error) throw new Error(resp.error.message || 'API fout');
          break;
        } catch (err) { lastTextErr = err; }
      }
      if (!resp || resp.error) throw lastTextErr || new Error('Alle modellen faalden');

      const raw = resp.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const data = JSON.parse(raw.replace(/```json|```/g, '').trim());
      setMessage(data); setStatus(''); setIsThinking(false);
      const tekst = data[lang] || data.nl || data.it || '';
      if (tekst) {
        speakAll(tekst, data.facts || [], lang, apiKey, lang,
          () => setIsSpeaking(true), () => setIsSpeaking(false));
      }
    } catch {
      setIsThinking(false);
      const fallback = buildFallback(n, day, month, days, lang);
      setMessage(fallback); setStatus('✨');
      setTimeout(() => setStatus(''), 2500);
      const tekst = fallback[lang] || '';
      speakAll(tekst, fallback.facts || [], lang, apiKey, lang,
        () => setIsSpeaking(true), () => setIsSpeaking(false));
    }
  };

  const handleReset = () => {
    window.speechSynthesis.cancel();
    setStep(STEP.LANG); setName(''); setBirthInput('');
    setMessage(null); setDaysInfo(null);
    setStatus(''); setIsSpeaking(false);
  };

  const banner = (() => {
    if (daysInfo === null) return null;
    if (daysInfo === 0)             return { text: L.bannerToday,           color:'#f5e642' };
    if (daysInfo>0 && daysInfo<=7)  return { text: L.bannerSoon(daysInfo),  color:'#ffb347' };
    if (daysInfo<0 && daysInfo>=-7) return { text: L.bannerPast(daysInfo),  color:'#a8edea' };
    return null;
  })();

  const isDone = step === STEP.DONE;
  const currentTitle = step === STEP.LANG ? 'Lo Specchio delle Fate' : L.title;

  return (
    <div style={S.app}>
      <style>{CSS}</style>
      <div style={S.bg}/>
      <div style={S.bgForest}/>

      {/* Vuurvliegjes */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        {FIREFLIES.map(f => (
          <div key={f.id} style={{
            position:'absolute', left:f.x+'%', top:f.y+'%',
            width:5, height:5, borderRadius:'50%', background:'#f5e642',
            boxShadow:'0 0 7px #f5e642, 0 0 14px rgba(245,230,66,0.38)',
            animation:'ffloat '+f.dur+'s ease-in-out '+f.delay+'s infinite',
            '--dx': f.dx+'px', '--dy': f.dy+'px',
          }}/>
        ))}
      </div>

      {/* Titel */}
      <header style={S.header}>
        <h1 style={S.title}>{currentTitle}</h1>
        <p style={S.subtitle}>✦ &nbsp; ✦ &nbsp; ✦</p>
      </header>

      {/* Tekstballon BOVEN spiegel */}
      <AnimatePresence>
        {message && (
          <div style={{ width:'100%', maxWidth:430, padding:'0 12px', marginBottom:4, position:'relative', zIndex:5 }}>
            <SpeechBubble
              message={message}
              lang={lang}
              onSpeak={() => {
                const tekst = message[lang] || message.nl || message.it || '';
                speakAll(tekst, message.facts || [], lang, apiKey, lang,
                  () => setIsSpeaking(true), () => setIsSpeaking(false));
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div initial={{ opacity:0, y:-8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }}
            style={{ ...S.banner, borderColor:banner.color, color:banner.color }}>
            {banner.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spiegel */}
      <div style={{ ...S.mirrorWrap, marginTop:10 }}>
        <OrnateFrame W={270} H={330}/>
        <div style={S.mirrorGlass}>
          <video ref={videoRef} autoPlay playsInline muted style={S.video}/>

          {isDone && message && (
            <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden',
              borderRadius:'50% 50% 47% 47%', zIndex:3 }}>
              {PARTICLES.map((p, index) => (
  <div key={p.id} style={{
    position:'absolute', left:p.x+'%', top:p.y+'%',
    fontSize: index === 0 ? '24px' : p.size + 'px', // De eerste is een grote fee
    opacity:0,
    animation:'sparkle '+p.dur+'s ease-in-out '+p.delay+'s infinite',
    zIndex: 10
  }}>
    {index === 0 ? '🧚' : '✨'} Dutch {/* De eerste is de fee, de rest zijn sterretjes */}
  </div>
))}



          <AnimatePresence>
            {step === STEP.LANG && <LangOverlay onSelect={selectLang}/>}
            {(step === STEP.NAME || step === STEP.DATE) && (
              <SetupOverlay
                step={step} lang={lang}
                name={name} setName={setName}
                birthInput={birthInput} setBirthInput={setBirthInput}
                onListen={startListening}
                isListening={isListening} listenTarget={listenTarget}
                onConfirm={step===STEP.NAME ? confirmName : confirmDate}
              />
            )}
          </AnimatePresence>

          {isThinking && (
            <div style={{ position:'absolute', bottom:14, left:'50%', transform:'translateX(-50%)',
              display:'flex', gap:6, zIndex:15 }}>
              {[0,200,400].map((d,i) => (
                <div key={i} style={{ width:8, height:8, borderRadius:'50%', background:'#f5e642',
                  animation:'bounce 1s ease-in-out '+d+'ms infinite', boxShadow:'0 0 6px #f5e642' }}/>
              ))}
            </div>
          )}

          {isSpeaking && (
            <div style={{ position:'absolute', inset:-4, borderRadius:'50% 50% 47% 47%',
              border:'3px solid #f5e642', animation:'speakRing 1s ease-in-out infinite',
              pointerEvents:'none', zIndex:4 }}/>
          )}
        </div>

        {isDone && name && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={S.nameBadge}>
            ✦ {name} ✦
          </motion.div>
        )}
      </div>

      {/* Status */}
      {status ? <p style={S.status}>{status}</p> : null}

      {/* Fallback indicator */}
      <AnimatePresence>
        {message?._isFallback && !isThinking && (
          <motion.p initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={{ margin:'2px 0 0', fontSize:10, color:'rgba(245,230,66,0.32)',
              fontStyle:'italic', textAlign:'center', position:'relative', zIndex:5 }}>
            {L.fallbackNote}
          </motion.p>
        )}
      </AnimatePresence>

      {/* Volgend kind */}
      {isDone && !isThinking && message && (
        <motion.div initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay:1.8 }}
          style={{ marginTop:14, display:'flex', flexDirection:'column', alignItems:'center', gap:5, position:'relative', zIndex:5 }}>
          <button onClick={handleReset} style={S.btnNext}>{L.btnNextChild}</button>
          <p style={{ margin:0, fontSize:10, color:'rgba(245,230,66,0.26)', fontStyle:'italic' }}>
            {L.btnNextHint}
          </p>
        </motion.div>
      )}

      {/* API sleutel knop */}
      {!ENV_KEY && (
        <button onClick={() => setShowKeyModal(true)} style={S.btnKey}>
          <Key size={10} style={{ marginRight:4 }}/>
          {L.keyBtn(!!apiKey)}
        </button>
      )}

      {/* API sleutel modal */}
      <AnimatePresence>
        {showKeyModal && (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            style={S.modal} onClick={e => e.target===e.currentTarget && setShowKeyModal(false)}>
            <div style={S.modalBox}>
              <h2 style={S.modalTitle}>{L.keyTitle}</h2>
              <p style={S.modalHint}>{L.keyHint}</p>
              <input type="password" id="keyInp" defaultValue={apiKey}
                placeholder={L.keyPlaceholder} style={S.modalInput}/>
              <div style={{ display:'flex', gap:10, marginTop:16 }}>
                <button onClick={() => setShowKeyModal(false)} style={S.modalCancel}>{L.keyCancel}</button>
                <button onClick={() => {
                  const k = document.getElementById('keyInp').value;
                  try { localStorage.setItem('magic_mirror_gemini_key', k); } catch {}
                  setShowKeyModal(false);
                  window.location.reload();
                }} style={S.modalSave}>{L.keySave}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CSS ───────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English:ital@0;1&display=swap');
  * { box-sizing:border-box; }
  input::placeholder { color:rgba(245,230,66,0.26); }
  @keyframes ffloat {
    0%   { opacity:0; transform:translate(0,0); }
    25%  { opacity:0.82; }
    50%  { opacity:0.28; transform:translate(var(--dx,20px),var(--dy,-15px)); }
    75%  { opacity:0.68; }
    100% { opacity:0; transform:translate(0,0); }
  }
  @keyframes sparkle {
    0%,100% { opacity:0; transform:scale(0.5); }
    50%     { opacity:0.88; transform:scale(1.2); }
  }
  @keyframes bounce {
    0%,100% { transform:translateY(0); opacity:0.38; }
    50%     { transform:translateY(-6px); opacity:1; }
  }
  @keyframes speakRing {
    0%,100% { opacity:0.32; transform:scale(1); }
    50%     { opacity:1; transform:scale(1.05); }
  }
  @keyframes mirrorPulse {
    0%,100% { box-shadow:0 0 32px rgba(212,160,23,0.22),0 0 65px rgba(212,160,23,0.07),inset 0 0 26px rgba(0,0,0,0.55); }
    50%     { box-shadow:0 0 52px rgba(212,160,23,0.42),0 0 105px rgba(212,160,23,0.14),inset 0 0 26px rgba(0,0,0,0.55); }
  }
  @keyframes titleShimmer {
    0%,100% { text-shadow:0 0 10px rgba(245,230,66,0.42),0 2px 4px rgba(0,0,0,0.8); }
    50%     { text-shadow:0 0 22px rgba(245,230,66,0.88),0 0 42px rgba(245,230,66,0.32),0 2px 4px rgba(0,0,0,0.8); }
  }
  @keyframes bannerGlow {
    0%,100% { box-shadow:0 0 9px rgba(245,230,66,0.2); }
    50%     { box-shadow:0 0 20px rgba(245,230,66,0.56); }
  }
`;

// ── Styles ────────────────────────────────────────────────────────────────
const S = {
  app: {
    minHeight:'100vh', background:'#0b0802',
    color:'#f0e8d0', fontFamily:"'IM Fell English', serif",
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'0 0 44px', position:'relative', overflow:'hidden',
  },
  bg: {
    position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
    background:'radial-gradient(ellipse at 50% 0%,rgba(52,30,4,0.78) 0%,rgba(7,4,2,0.95) 60%,#030200 100%)',
  },
  bgForest: {
    position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
    background:`
      radial-gradient(ellipse at 12% 90%,rgba(16,42,7,0.3) 0%,transparent 50%),
      radial-gradient(ellipse at 88% 90%,rgba(16,42,7,0.3) 0%,transparent 50%),
      radial-gradient(ellipse at 50% 100%,rgba(26,52,7,0.38) 0%,transparent 38%)
    `,
  },
  header: {
    width:'100%', maxWidth:480, padding:'6px 16px 3px',
    display:'flex', flexDirection:'column', alignItems:'center',
    position:'relative', zIndex:5,
  },
  title: {
    margin:'0 0 2px', fontSize:22, fontWeight:700,
    color:'#f5e642', animation:'titleShimmer 3s ease-in-out infinite',
    letterSpacing:'0.05em',
  },
  subtitle: {
    margin:'3px 0 0', fontSize:11,
    color:'rgba(245,230,66,0.38)', letterSpacing:'0.14em', fontStyle:'italic',
  },
  banner: {
    width:'100%', maxWidth:420, margin:'0 12px 6px',
    padding:'7px 16px', background:'rgba(16,9,0,0.86)',
    border:'1px solid', borderRadius:20, fontSize:13, textAlign:'center',
    fontStyle:'italic', letterSpacing:'0.04em',
    zIndex:5, position:'relative', animation:'bannerGlow 2.5s ease-in-out infinite',
  },
  mirrorWrap: {
    position:'relative', width:270, height:330,
    display:'flex', alignItems:'center', justifyContent:'center',
    zIndex:5, marginBottom:6,
  },
  mirrorGlass: {
    position:'absolute', top:18, left:22,
    width:226, height:290, borderRadius:'50% 50% 47% 47%',
    overflow:'hidden',
    background:'linear-gradient(160deg,#0b1606 0%,#030702 100%)',
    animation:'mirrorPulse 4s ease-in-out infinite', zIndex:1,
  },
  video: {
    width:'100%', height:'100%', objectFit:'cover',
    transform:'scaleX(-1)',
    filter:'brightness(0.92) contrast(1.05) saturate(0.82)',
  },
  nameBadge: {
    position:'absolute', bottom:-10, left:'50%', transform:'translateX(-50%)',
    background:'linear-gradient(135deg,rgba(26,14,2,0.96),rgba(16,9,0,0.96))',
    border:'1px solid rgba(212,160,23,0.46)',
    borderRadius:20, padding:'4px 18px',
    fontSize:12, color:'#f5e642', whiteSpace:'nowrap', zIndex:10,
    letterSpacing:'0.08em', boxShadow:'0 2px 10px rgba(0,0,0,0.5)',
  },
  status: {
    fontSize:12, color:'rgba(245,230,66,0.55)', fontStyle:'italic',
    margin:'4px 12px', zIndex:5, textAlign:'center', position:'relative',
    maxWidth:380, lineHeight:1.6,
  },
  btnNext: {
    padding:'11px 28px',
    background:'linear-gradient(135deg,#8B6914,#d4a017,#f5e642,#d4a017,#8B6914)',
    backgroundSize:'200% auto', border:'none', borderRadius:30,
    color:'#160b00', fontWeight:700, cursor:'pointer',
    fontSize:14, fontFamily:"'IM Fell English', serif", letterSpacing:'0.08em',
    boxShadow:'0 4px 18px rgba(212,160,23,0.46),0 0 34px rgba(212,160,23,0.16)',
  },
  btnKey: {
    marginTop:14, padding:'5px 14px', background:'transparent',
    border:'1px solid rgba(212,160,23,0.13)', borderRadius:20,
    fontSize:10, color:'rgba(212,160,12,0.36)', letterSpacing:'0.1em',
    cursor:'pointer', display:'flex', alignItems:'center',
    position:'relative', zIndex:5, fontFamily:"'IM Fell English', serif",
  },
  modal: {
    position:'fixed', inset:0, background:'rgba(0,0,0,0.88)',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:100,
  },
  modalBox: {
    background:'linear-gradient(160deg,#160c05,#0a0502)',
    border:'2px solid rgba(212,160,23,0.46)',
    borderRadius:20, padding:24, maxWidth:300, width:'90%',
    boxShadow:'0 8px 40px rgba(0,0,0,0.8)',
  },
  modalTitle: {
    margin:'0 0 4px', fontWeight:400, fontSize:18,
    color:'#f5e642', textAlign:'center', fontFamily:"'IM Fell English', serif",
  },
  modalHint: {
    margin:'0 0 14px', fontSize:11, lineHeight:1.6,
    color:'rgba(245,230,66,0.4)', textAlign:'center', whiteSpace:'pre-line',
  },
  modalInput: {
    width:'100%', background:'rgba(0,0,0,0.4)',
    border:'1px solid rgba(212,160,23,0.26)',
    borderRadius:10, padding:'10px 14px',
    fontSize:13, color:'#f0e8d0', outline:'none', textAlign:'center',
  },
  modalCancel: {
    flex:1, padding:'9px', background:'transparent',
    border:'1px solid rgba(255,255,255,0.1)', borderRadius:10,
    color:'rgba(255,255,255,0.3)', cursor:'pointer', fontSize:12,
    fontFamily:"'IM Fell English', serif",
  },
  modalSave: {
    flex:1, padding:'9px',
    background:'linear-gradient(135deg,#d4a017,#f5e642)',
    border:'none', borderRadius:10, color:'#160900',
    fontWeight:700, cursor:'pointer', fontSize:12,
    fontFamily:"'IM Fell English', serif", letterSpacing:'0.05em',
  },
};
