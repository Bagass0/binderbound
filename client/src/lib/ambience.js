/**
 * Ambiance sonore originale, générée en direct avec Web Audio (aucun fichier, aucun asset
 * Riot), dans l'esprit d'une partie qui commence sur la Faille de l'invocateur : forêt au
 * vent avec des oiseaux, cordes et chœur en nappes, harpe, flûte, tambours de guerre lointains.
 *
 * Si `public/audio/ambiance.mp3` existe, ce fichier est joué en boucle à la place.
 */
const CUSTOM_TRACK = '/audio/ambiance.mp3';
const VOLUME = 0.9;
const BPM = 72;
const STEP = 60 / BPM / 4; // double croche
const BAR = 16; // pas par mesure
const PHRASE = BAR * 2; // un accord = deux mesures
const LOOKAHEAD = 0.3; // secondes programmées à l'avance

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Ré mineur, épique et serein : Dm(add9) → B♭ → Gm → A.
const CHORDS = [
  { bass: 38, notes: [50, 57, 62, 64, 69] },
  { bass: 34, notes: [46, 53, 58, 62, 65] },
  { bass: 31, notes: [43, 50, 55, 58, 62] },
  { bass: 33, notes: [45, 52, 57, 61, 64] },
];

// Thème de flûte, une phrase par accord : [pas, note MIDI, durée en pas].
const THEME = [
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
];

// Harpe : montée puis descente sur les notes de l'accord, à la croche.
const HARP = [0, 1, 2, 3, 4, 3, 2, 1];

/** Réverbération : réponse impulsionnelle de bruit qui décroît (grande clairière). */
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

/** La partition, branchée sur `output` (exportée pour le rendu hors ligne des tests). */
export function createScore(ctx, output) {
  const reverb = createReverb(ctx);
  const wet = new GainNode(ctx, { gain: 0.55 });
  reverb.connect(wet).connect(output);
  const noise = noiseBuffer(ctx, 2);

  // Sortie d'une voix : son direct + part de réverbération, avec position stéréo.
  const voice = (node, { send = 0.4, pan = 0 } = {}) => {
    const panner = new StereoPannerNode(ctx, { pan });
    node.connect(panner).connect(output);
    if (send) panner.connect(new GainNode(ctx, { gain: send })).connect(reverb);
  };

  const strings = (notes, time, duration) => {
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 900, Q: 0.5 });
    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: 2.2,
      hold: duration - 2.2,
      release: 2.5,
      level: 0.022,
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

  const harp = (note, time, pan) => {
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.6);
    voice(gain, { send: 0.6, pan });
    for (const [type, ratio, level] of [
      ['triangle', 1, 1],
      ['sine', 2, 0.35],
    ]) {
      const osc = new OscillatorNode(ctx, { type, frequency: hz(note) * ratio });
      const partial = new GainNode(ctx, { gain: level });
      osc.connect(partial).connect(gain);
      osc.start(time);
      osc.stop(time + 1.7);
    }
  };

  const flute = (note, time, duration) => {
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: hz(note) });
    // Vibrato qui s'installe après l'attaque, comme un souffle tenu.
    const vibrato = new OscillatorNode(ctx, { frequency: 5 });
    const depth = new GainNode(ctx, { gain: 0 });
    depth.gain.setValueAtTime(0, time);
    depth.gain.linearRampToValueAtTime(7, time + Math.min(duration, 0.6));
    vibrato.connect(depth).connect(osc.detune);

    const gain = new GainNode(ctx, { gain: 0 });
    const end = envelope(gain.gain, time, {
      attack: 0.09,
      hold: Math.max(duration - 0.15, 0.05),
      release: 0.35,
      level: 0.045,
    });
    osc.connect(gain);

    const breath = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true });
    const breathFilter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: hz(note), Q: 2 });
    const breathGain = new GainNode(ctx, { gain: 0.08 });
    breath.connect(breathFilter).connect(breathGain).connect(gain);

    voice(gain, { send: 0.8, pan: 0.15 });
    for (const node of [osc, vibrato, breath]) {
      node.start(time);
      node.stop(end);
    }
  };

  // Tambour de guerre lointain : coup grave + peau (bruit filtré).
  const drum = (time, level) => {
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 85 });
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.35);
    const body = new GainNode(ctx, { gain: level });
    body.gain.exponentialRampToValueAtTime(0.0001, time + 0.9);
    osc.connect(body);
    voice(body, { send: 0.35 });
    osc.start(time);
    osc.stop(time + 1);

    const skin = new AudioBufferSourceNode(ctx, { buffer: noise });
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 900 });
    const skinGain = new GainNode(ctx, { gain: level * 0.25 });
    skinGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.15);
    skin.connect(filter).connect(skinGain);
    voice(skinGain, { send: 0.35 });
    skin.start(time);
    skin.stop(time + 0.2);
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
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.012, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      osc.connect(gain);
      voice(gain, { send: 0.5, pan });
      osc.start(t);
      osc.stop(t + 0.1);
    }
  };

  /** Vent dans les arbres : bruit filtré dont la couleur ondule lentement. */
  const wind = (time) => {
    const source = new AudioBufferSourceNode(ctx, { buffer: noise, loop: true });
    const filter = new BiquadFilterNode(ctx, { type: 'bandpass', frequency: 700, Q: 0.8 });
    const sweep = new OscillatorNode(ctx, { frequency: 0.06 });
    const sweepDepth = new GainNode(ctx, { gain: 350 });
    sweep.connect(sweepDepth).connect(filter.frequency);
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.03, time + 4);
    source.connect(filter).connect(gain);
    voice(gain, { send: 0.3 });
    source.start(time);
    sweep.start(time);
  };

  const playStep = (step, time) => {
    const index = Math.floor(step / PHRASE);
    const chord = CHORDS[index % CHORDS.length];
    const inPhrase = step % PHRASE;
    const inBar = step % BAR;
    const cycle = Math.floor(index / CHORDS.length); // un tour complet = 8 mesures
    const phraseLength = PHRASE * STEP;

    if (inPhrase === 0) {
      strings(chord.notes, time, phraseLength);
      bass(chord.bass, time, phraseLength);
      if (cycle % 2 === 1) choir([chord.notes[0] + 12, chord.notes[1] + 12], time, phraseLength);
    }
    // Harpe dès le début, flûte à partir du deuxième tour, un tour sur deux pour respirer.
    if (step % 2 === 0) {
      const i = (step / 2) % HARP.length;
      harp(chord.notes[HARP[i]] + 12, time, i < 4 ? -0.35 : 0.35);
    }
    if (cycle > 0 && cycle % 2 === 1) {
      for (const [at, note, length] of THEME[index % THEME.length]) {
        if (at === inPhrase) flute(note, time, length * STEP);
      }
    }
    // Tambours : un coup par mesure, une relance avant chaque changement d'accord.
    if (inBar === 0) drum(time, inPhrase === 0 ? 0.32 : 0.22);
    if (inPhrase >= PHRASE - 4 && inPhrase % 2 === 0) drum(time, 0.12);
    if (inBar === 8 && Math.random() < 0.3) bird(time + Math.random() * STEP * 6);
  };

  return { playStep, wind };
}

function createSynth() {
  const ctx = new AudioContext();
  const master = new GainNode(ctx, { gain: 0 });
  const limiter = new DynamicsCompressorNode(ctx, { threshold: -10, ratio: 6 });
  master.connect(limiter).connect(ctx.destination);
  const score = createScore(ctx, master);

  let timer = null;
  let step = 0;
  let next = 0;
  let windStarted = false;

  return {
    async start() {
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.8);
      if (!windStarted) {
        score.wind(ctx.currentTime);
        windStarted = true;
      }
      if (timer) return;
      next = ctx.currentTime + 0.1;
      timer = setInterval(() => {
        while (next < ctx.currentTime + LOOKAHEAD) {
          score.playStep(step++, next);
          next += STEP;
        }
      }, 50);
    },
    stop() {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
      clearInterval(timer);
      timer = null;
      setTimeout(() => ctx.state === 'running' && !timer && ctx.suspend(), 1500);
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
    async start() {
      await audio.play();
      fadeTo(VOLUME);
    },
    stop: () => fadeTo(0, () => audio.pause()),
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
/** Lecteur unique, créé au premier clic (les navigateurs exigent un geste pour jouer du son). */
export async function getAmbience() {
  player ??= hasCustomTrack().then((custom) =>
    custom ? createTrack(CUSTOM_TRACK) : createSynth(),
  );
  return player;
}
