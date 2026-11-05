/**
 * Ambiances sonores originales, générées en direct avec Web Audio (aucun fichier, aucun asset
 * Riot), dans l'esprit des contrées de Runeterra. Chaque style (STYLES) est une partition :
 * tempo, accords, instruments et thème. Changer de style fait un fondu enchaîné.
 *
 * Si `public/audio/ambiance.mp3` existe, ce fichier est joué en boucle à la place.
 */
const CUSTOM_TRACK = '/audio/ambiance.mp3';
const VOLUME = 0.9;
const BAR = 16; // doubles croches par mesure
const PHRASE = BAR * 2; // un accord = deux mesures
const LOOKAHEAD = 0.3; // secondes programmées à l'avance
const CROSSFADE = 1.8; // secondes

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

/**
 * Les styles proposés. `chords` : basse + notes de l'accord (MIDI) ; `theme` : une phrase de
 * mélodie par accord, en [pas, note, durée en pas] ; `melodyCycles` : tours de grille où la
 * mélodie joue (un tour = tous les accords). `drums` et `percussion` reçoivent la position
 * dans la mesure et dans la phrase, et renvoient un volume (ou rien).
 */
export const STYLES = {
  // La Faille de l'invocateur au début d'une partie : épique et serein.
  faille: {
    bpm: 72,
    chords: [
      { bass: 38, notes: [50, 57, 62, 64, 69] }, // Dm(add9)
      { bass: 34, notes: [46, 53, 58, 62, 65] }, // B♭
      { bass: 31, notes: [43, 50, 55, 58, 62] }, // Gm
      { bass: 33, notes: [45, 52, 57, 61, 64] }, // A
    ],
    pad: 0.022,
    choir: 'alternate',
    pluck: { timbre: 'harp', every: 2, pattern: [0, 1, 2, 3, 4, 3, 2, 1], octave: 12 },
    melody: 'flute',
    melodyCycles: (cycle) => cycle % 2 === 1,
    theme: [
      [
        [0, 81, 6],
        [6, 79, 2],
        [8, 77, 4],
        [12, 76, 4],
        [16, 74, 14],
      ],
      [
        [0, 77, 4],
        [4, 79, 4],
        [8, 81, 8],
        [16, 82, 4],
        [20, 81, 4],
        [24, 77, 8],
      ],
      [
        [0, 79, 6],
        [6, 77, 2],
        [8, 74, 8],
        [16, 70, 4],
        [20, 74, 4],
        [24, 79, 8],
      ],
      [
        [0, 76, 8],
        [8, 73, 4],
        [12, 76, 4],
        [16, 81, 16],
      ],
    ],
    drums: (inBar, inPhrase) => {
      if (inBar === 0) return inPhrase === 0 ? 0.32 : 0.22;
      if (inPhrase >= PHRASE - 4 && inPhrase % 2 === 0) return 0.12;
    },
    birds: 0.3,
    wind: 0.03,
  },

  // Ionia : temples et cerisiers, koto pentatonique et carillons, sans percussions.
  ionia: {
    bpm: 60,
    chords: [
      { bass: 38, notes: [50, 57, 62, 66, 69] }, // D(add9)
      { bass: 35, notes: [47, 54, 59, 62, 66] }, // Bm7
      { bass: 31, notes: [43, 50, 55, 59, 62] }, // Gmaj7
      { bass: 33, notes: [45, 52, 57, 62, 64] }, // Asus
    ],
    pad: 0.016,
    choir: false,
    pluck: { timbre: 'koto', every: 4, pattern: [0, 2, 4, 3, 1, 4, 2, 3], octave: 12, skip: 0.3 },
    melody: 'flute',
    melodyCycles: (cycle) => cycle % 3 !== 0,
    theme: [
      [
        [0, 78, 8],
        [8, 76, 4],
        [12, 74, 4],
        [16, 81, 16],
      ],
      [
        [0, 74, 6],
        [6, 76, 2],
        [8, 78, 8],
        [16, 71, 16],
      ],
      [
        [0, 79, 8],
        [8, 78, 4],
        [12, 76, 4],
        [16, 74, 16],
      ],
      [
        [0, 76, 8],
        [8, 78, 8],
        [16, 81, 8],
        [24, 76, 8],
      ],
    ],
    bells: 0.35,
    birds: 0.45,
    wind: 0.02,
  },

  // Une taverne de Demacia : luth gratté, flûte à bec, tambour sur cadre et tambourin.
  taverne: {
    bpm: 100,
    chords: [
      { bass: 38, notes: [50, 57, 62, 65, 69] }, // Dm
      { bass: 36, notes: [48, 55, 60, 64, 67] }, // C
      { bass: 38, notes: [50, 57, 62, 65, 69] }, // Dm
      { bass: 33, notes: [45, 52, 57, 60, 64] }, // Am
    ],
    pad: 0.008,
    choir: false,
    pluck: { timbre: 'lute', strum: [0, 4, 8, 12], octave: 0 },
    melody: 'recorder',
    melodyCycles: () => true,
    theme: [
      [
        [0, 74, 2],
        [2, 76, 2],
        [4, 77, 4],
        [8, 76, 2],
        [10, 74, 2],
        [12, 72, 4],
        [16, 74, 4],
        [20, 69, 4],
        [24, 74, 8],
      ],
      [
        [0, 72, 2],
        [2, 74, 2],
        [4, 76, 4],
        [8, 79, 4],
        [12, 76, 4],
        [16, 74, 2],
        [18, 72, 2],
        [20, 71, 4],
        [24, 72, 8],
      ],
      [
        [0, 77, 4],
        [4, 76, 2],
        [6, 74, 2],
        [8, 72, 4],
        [12, 74, 4],
        [16, 76, 2],
        [18, 77, 2],
        [20, 79, 4],
        [24, 81, 8],
      ],
      [
        [0, 76, 4],
        [4, 74, 2],
        [6, 72, 2],
        [8, 71, 4],
        [12, 72, 4],
        [16, 69, 4],
        [20, 71, 4],
        [24, 69, 8],
      ],
    ],
    drums: (inBar) => ({ 0: 0.28, 6: 0.16, 8: 0.22, 12: 0.12 })[inBar],
    tom: true,
    percussion: (inBar) => (inBar % 4 === 2 ? 0.05 : inBar % 4 === 0 ? 0.025 : undefined),
    wind: 0,
  },

  // Les Îles obscures : brume, chœurs, cloches lointaines et un tambour sourd.
  ombres: {
    bpm: 54,
    chords: [
      { bass: 36, notes: [48, 55, 60, 63, 67] }, // Cm
      { bass: 32, notes: [44, 51, 56, 60, 63] }, // A♭
      { bass: 29, notes: [41, 48, 53, 56, 60] }, // Fm
      { bass: 31, notes: [43, 50, 55, 59, 62] }, // G
    ],
    pad: 0.02,
    padCutoff: 600,
    choir: 'always',
    pluck: { timbre: 'harp', every: 4, pattern: [4, 3, 2, 1], octave: 12, skip: 0.4 },
    melody: 'flute',
    melodyCycles: (cycle) => cycle % 2 === 1,
    theme: [
      [
        [0, 79, 12],
        [12, 75, 4],
        [16, 74, 16],
      ],
      [
        [0, 75, 8],
        [8, 72, 8],
        [16, 75, 16],
      ],
      [
        [0, 77, 8],
        [8, 75, 4],
        [12, 72, 4],
        [16, 68, 16],
      ],
      [
        [0, 74, 12],
        [12, 71, 4],
        [16, 67, 16],
      ],
    ],
    drums: (_inBar, inPhrase) => (inPhrase === 0 ? 0.3 : undefined),
    bells: 0.25,
    wind: 0.045,
  },
};

/** Réverbération : réponse impulsionnelle de bruit qui décroît (grande salle). */
function createReverb(ctx, seconds = 4.5) {
  const length = ctx.sampleRate * seconds;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2.5;
  }
  return new ConvolverNode(ctx, { buffer: impulse });
}

function noiseBuffer(ctx, seconds) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  buffer.getChannelData(0).forEach((_, i, data) => (data[i] = Math.random() * 2 - 1));
  return buffer;
}

/** Enveloppe : montée, maintien, extinction. */
function envelope(param, time, { attack, hold, release, level }) {
  param.setValueAtTime(0, time);
  param.linearRampToValueAtTime(level, time + attack);
  param.setValueAtTime(level, time + attack + hold);
  param.linearRampToValueAtTime(0, time + attack + hold + release);
  return time + attack + hold + release;
}

/** Frappe : montée éclair puis décroissance exponentielle. */
function strike(param, time, level, decay) {
  param.setValueAtTime(0, time);
  param.linearRampToValueAtTime(level, time + 0.005);
  param.exponentialRampToValueAtTime(0.0001, time + decay);
}

// Cordes pincées : harpe (ronde), koto (attaque qui glisse vers la note), luth (sec, boisé).
const PLUCKS = {
  harp: {
    partials: [
      ['triangle', 1, 1],
      ['sine', 2, 0.35],
    ],
    decay: 1.6,
    level: 0.05,
    send: 0.6,
  },
  koto: {
    partials: [
      ['triangle', 1, 1],
      ['sine', 3, 0.2],
    ],
    decay: 2.2,
    level: 0.06,
    send: 0.7,
    bend: 40,
  },
  lute: {
    partials: [
      ['sawtooth', 1, 0.5],
      ['triangle', 2, 0.4],
    ],
    decay: 0.9,
    level: 0.035,
    send: 0.35,
    cutoff: 1800,
  },
};

/**
 * La partition d'un style, branchée sur `output` (exportée pour le rendu hors ligne des tests).
 * Renvoie `playStep(n, time)`, la durée d'un pas, et `start` / `stop` pour le vent continu.
 */
export function createScore(ctx, output, style = STYLES.faille) {
  const reverb = createReverb(ctx);
  const wet = new GainNode(ctx, { gain: 0.55 });
  reverb.connect(wet).connect(output);
  const noise = noiseBuffer(ctx, 2);
  const step = 60 / style.bpm / 4;

  // Sortie d'une voix : son direct + part de réverbération, avec position stéréo.
  const voice = (node, { send = 0.4, pan = 0 } = {}) => {
    const panner = new StereoPannerNode(ctx, { pan });
    node.connect(panner).connect(output);
    if (send) panner.connect(new GainNode(ctx, { gain: send })).connect(reverb);
  };

  const strings = (notes, time, duration) => {
    const filter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: style.padCutoff ?? 900,
      Q: 0.5,
    });
    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: 2.2,
      hold: duration - 2.2,
      release: 2.5,
      level: style.pad,
    });
    filter.connect(gain);
    voice(gain, { send: 0.7 });
    for (const note of notes) {
      for (const detune of [-9, 0, 9]) {
        const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: hz(note), detune });
        osc.connect(filter);
        osc.start(time);
        osc.stop(end);
      }
    }
  };

  // Chœur « ah » : dents de scie filtrées sur deux formants de voyelle.
  const choir = (notes, time, duration) => {
    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: 3,
      hold: duration - 3,
      release: 3,
      level: 0.05,
    });
    voice(gain, { send: 0.9 });
    for (const formant of [800, 1150]) {
      const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: formant, Q: 6 });
      filter.connect(gain);
      for (const note of notes) {
        const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: hz(note), detune: 5 });
        osc.connect(filter);
        osc.start(time);
        osc.stop(end);
      }
    }
  };

  const bass = (note, time, duration) => {
    const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: hz(note) });
    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: 0.8,
      hold: duration - 0.8,
      release: 1.5,
      level: 0.11,
    });
    osc.connect(gain);
    voice(gain, { send: 0.2 });
    osc.start(time);
    osc.stop(end);
  };

  const pluck = (note, time, pan, timbre) => {
    const p = PLUCKS[timbre];
    const gain = new GainNode(ctx, { gain: 0 });
    strike(gain.gain, time, p.level, p.decay);
    let out = gain;
    if (p.cutoff) {
      out = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: p.cutoff });
      gain.connect(out);
    }
    voice(out, { send: p.send, pan });
    for (const [type, ratio, level] of p.partials) {
      const osc = new OscillatorNode(ctx, { type, frequency: hz(note) * ratio });
      if (p.bend) {
        osc.detune.setValueAtTime(-p.bend, time);
        osc.detune.linearRampToValueAtTime(0, time + 0.08);
      }
      const partial = new GainNode(ctx, { gain: level });
      osc.connect(partial).connect(gain);
      osc.start(time);
      osc.stop(time + p.decay + 0.1);
    }
  };

  // Flûte (souffle et vibrato) ou flûte à bec (plus droite, plus boisée).
  const melody = (note, time, duration, instrument) => {
    const recorder = instrument === 'recorder';
    const osc = new OscillatorNode(ctx, {
      type: recorder ? 'triangle' : 'sine',
      frequency: hz(note),
    });
    const vibrato = new OscillatorNode(ctx, { frequency: recorder ? 6 : 5 });
    const depth = new GainNode(ctx, { gain: 0 });
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(recorder ? 3 : 7, time + Math.min(duration, 0.6));
    vibrato.connect(depth).connect(osc.detune);

    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: recorder ? 0.03 : 0.09,
      hold: Math.max(duration - 0.12, 0.05),
      release: recorder ? 0.12 : 0.35,
      level: recorder ? 0.04 : 0.045,
    });
    osc.connect(gain);

    const breath = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true });
    const breathFilter = new BiquadFilterNode(ctx, {
      type: 'bandpass',
      frequency: hz(note),
      Q: 2,
    });
    const breathGain = new GainNode(ctx, { gain: recorder ? 0.05 : 0.08 });
    breath.connect(breathFilter).connect(breathGain).connect(gain);

    voice(gain, { send: recorder ? 0.4 : 0.8, pan: 0.15 });
    for (const node of [osc, vibrato, breath]) {
      node.start(time);
      node.stop(end);
    }
  };

  // Tambour de guerre lointain, ou tambour sur cadre plus aigu pour la taverne.
  const drum = (time, level) => {
    const [from, to] = style.tom ? [150, 85] : [85, 42];
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: from });
    osc.frequency.exponentialRampToValueAtTime(to, time + 0.3);
    const body = new GainNode(ctx, { gain: level });
    body.gain.exponentialRampToValueAtTime(0.0001, time + (style.tom ? 0.45 : 0.9));
    osc.connect(body);
    voice(body, { send: 0.35 });
    osc.start(time);
    osc.stop(time + 1);

    const skin = new AudioBufferSourceNode(ctx, { buffer: noise });
    const filter = new BiquadFilterNode(ctx, {
      type: 'lowpass',
      frequency: style.tom ? 2200 : 900,
    });
    const skinGain = new GainNode(ctx, { gain: level * 0.25 });
    skinGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    skin.connect(filter).connect(skinGain);
    voice(skinGain, { send: 0.35 });
    skin.start(time);
    skin.stop(time + 0.2);
  };

  // Tambourin : bruit aigu au tintement métallique.
  const tambourine = (time, level) => {
    const source = new AudioBufferSourceNode(ctx, { buffer: noise });
    const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 8000, Q: 1.5 });
    const gain = new GainNode(ctx, { gain: 0 });
    strike(gain.gain, time, level, 0.18);
    source.connect(filter).connect(gain);
    voice(gain, { send: 0.25, pan: -0.3 });
    source.start(time, Math.random());
    source.stop(time + 0.2);
  };

  // Cloche ou carillon : partiels inharmoniques à longue résonance.
  const bell = (time) => {
    const { notes } = style.chords[0];
    const note = notes[Math.floor(Math.random() * notes.length)] + 24;
    const gain = new GainNode(ctx, { gain: 0 });
    strike(gain.gain, time, 0.022, 4);
    voice(gain, { send: 0.9, pan: Math.random() * 1.2 - 0.6 });
    for (const [ratio, level] of [
      [1, 1],
      [2.76, 0.4],
      [5.4, 0.15],
    ]) {
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: hz(note) * ratio });
      const partial = new GainNode(ctx, { gain: level });
      osc.connect(partial).connect(gain);
      osc.start(time);
      osc.stop(time + 4.1);
    }
  };

  // Oiseau : quelques gazouillis rapides, placés au hasard dans l'espace.
  const bird = (time) => {
    const pan = Math.random() * 1.6 - 0.8;
    const base = 2600 + Math.random() * 1400;
    const count = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const t = time + i * (0.11 + Math.random() * 0.05);
      const osc = new OscillatorNode(ctx, { type: 'sine', frequency: base });
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, t + 0.06);
      const gain = new GainNode(ctx, { gain: 0 });
      strike(gain.gain, t, 0.012, 0.08);
      osc.connect(gain);
      voice(gain, { send: 0.5, pan });
      osc.start(t);
      osc.stop(t + 0.1);
    }
  };

  // Vent : bruit filtré dont la couleur ondule lentement (nappe continue).
  let windNodes = [];
  const start = (time) => {
    if (!style.wind) return;
    const source = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true });
    const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 700, Q: 0.8 });
    const sweep = new OscillatorNode(ctx, { frequency: 0.06 });
    const sweepDepth = new GainNode(ctx, { gain: 350 });
    sweep.connect(sweepDepth).connect(filter.frequency);
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(style.wind, time + 4);
    source.connect(filter).connect(gain);
    voice(gain, { send: 0.3 });
    source.start(time);
    sweep.start(time);
    windNodes = [source, sweep];
  };
  const stop = (time) => windNodes.forEach((node) => node.stop(time));

  const playStep = (n, time) => {
    const index = Math.floor(n / PHRASE);
    const chord = style.chords[index % style.chords.length];
    const inPhrase = n % PHRASE;
    const inBar = n % BAR;
    const cycle = Math.floor(index / style.chords.length);
    const phraseLength = PHRASE * step;

    if (inPhrase === 0) {
      strings(chord.notes, time, phraseLength);
      bass(chord.bass, time, phraseLength);
      const sing = style.choir === 'always' || (style.choir === 'alternate' && cycle % 2 === 1);
      if (sing) choir([chord.notes[0] + 12, chord.notes[1] + 12], time, phraseLength);
    }

    const p = style.pluck;
    if (p.strum?.includes(inBar)) {
      // Accord gratté, en alternant coups vers le bas et vers le haut.
      const down = (inBar / 4) % 2 === 0;
      const notes = down ? chord.notes : [...chord.notes].reverse();
      notes.forEach((note, i) => pluck(note + p.octave, time + i * 0.012, 0.1, p.timbre));
    } else if (p.every && n % p.every === 0 && Math.random() >= (p.skip ?? 0)) {
      const i = (n / p.every) % p.pattern.length;
      const pan = i < p.pattern.length / 2 ? -0.35 : 0.35;
      pluck(chord.notes[p.pattern[i]] + p.octave, time, pan, p.timbre);
    }

    if (style.melodyCycles(cycle)) {
      for (const [at, note, length] of style.theme[index % style.theme.length]) {
        if (at === inPhrase) melody(note, time, length * step, style.melody);
      }
    }

    const hit = style.drums?.(inBar, inPhrase);
    if (hit) drum(time, hit);
    const shake = style.percussion?.(inBar, inPhrase);
    if (shake) tambourine(time, shake);
    if (inBar === 0 && style.bells && Math.random() < style.bells) {
      bell(time + Math.random() * step * 8);
    }
    if (inBar === 8 && style.birds && Math.random() < style.birds) {
      bird(time + Math.random() * step * 6);
    }
  };

  return { playStep, start, stop, step };
}

function createSynth(initialStyle) {
  const ctx = new AudioContext();
  const master = new GainNode(ctx, { gain: 0 });
  const limiter = new DynamicsCompressorNode(ctx, { threshold: -10, ratio: 6 });
  master.connect(limiter).connect(ctx.destination);

  let style = initialStyle;
  let current = null; // { score, bus }
  let timer = null;
  let n = 0;
  let next = 0;

  // Chaque style joue sur son propre bus : au changement, l'ancien s'efface pendant que le
  // nouveau monte, sans couper net les notes déjà programmées.
  const load = () => {
    const now = ctx.currentTime;
    if (current) {
      const old = current;
      old.bus.gain.setTargetAtTime(0, now, CROSSFADE / 4);
      old.score.stop(now + CROSSFADE * 2);
      setTimeout(() => old.bus.disconnect(), CROSSFADE * 4000);
    }
    const bus = new GainNode(ctx, { gain: 0 });
    bus.gain.setTargetAtTime(1, now, CROSSFADE / 4);
    bus.connect(master);
    const score = createScore(ctx, bus, STYLES[style] ?? STYLES.faille);
    score.start(now);
    current = { score, bus };
    n = 0;
    next = now + 0.1;
  };

  const tick = () => {
    while (next < ctx.currentTime + LOOKAHEAD) {
      current.score.playStep(n++, next);
      next += current.score.step;
    }
  };

  return {
    async start() {
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.8);
      if (timer) return;
      if (!current) load();
      else next = ctx.currentTime + 0.1;
      timer = setInterval(tick, 50);
    },
    stop() {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      clearInterval(timer);
      timer = null;
      setTimeout(() => ctx.state === 'running' && !timer && ctx.suspend(), 1500);
    },
    setStyle(nextStyle) {
      if (nextStyle === style) return;
      style = nextStyle;
      if (current) load();
    },
  };
}

function createTrack(url) {
  const audio = Object.assign(new Audio(url), { loop: true, volume: 0 });
  let fade;
  const fadeTo = (target, done) => {
    clearInterval(fade);
    fade = setInterval(() => {
      const step = Math.sign(target - audio.volume) * 0.04;
      audio.volume = Math.min(Math.max(audio.volume + step, 0), 1);
      if (Math.abs(target - audio.volume) < 0.05) {
        audio.volume = target;
        clearInterval(fade);
        done?.();
      }
    }, 60);
  };
  return {
    custom: true,
    async start() {
      await audio.play();
      fadeTo(Math.min(VOLUME, 1));
    },
    stop: () => fadeTo(0, () => audio.pause()),
    setStyle: () => {},
  };
}

/** Un fichier audio a-t-il été déposé ? (en prod, une URL inconnue renvoie la page HTML) */
async function hasCustomTrack() {
  try {
    const res = await fetch(CUSTOM_TRACK, { method: 'HEAD' });
    return res.ok && Boolean(res.headers.get('content-type')?.startsWith('audio/'));
  } catch {
    return false;
  }
}

let player;
/**
 * Lecteur unique, créé au premier geste (les navigateurs l'exigent pour jouer du son).
 * `style` (clé de STYLES) sert à la création ; ensuite, `setStyle` en change.
 */
export async function getAmbience(style = 'faille') {
  player ??= hasCustomTrack().then((custom) =>
    custom ? createTrack(CUSTOM_TRACK) : createSynth(style),
  );
  return player;
}
