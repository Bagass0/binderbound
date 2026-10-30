/**
 * Ambiance sonore originale, générée en direct avec Web Audio (aucun fichier, aucun asset
 * Riot) : nappes lentes en ré mineur, arpège cristallin avec écho, pulsation douce.
 * Calme et rythmée, dans l'esprit d'une partie qui commence sur la Faille.
 *
 * Si `public/audio/ambiance.mp3` existe, ce fichier est joué en boucle à la place.
 */
const CUSTOM_TRACK = '/audio/ambiance.mp3';
const VOLUME = 0.32;
const BPM = 84;
const EIGHTH = 60 / BPM / 2;
const BAR = 8; // croches par mesure
const LOOKAHEAD = 0.25; // secondes programmées à l'avance

const hz = (midi) => 440 * 2 ** ((midi - 69) / 12);

// Deux mesures par accord : Dm9 → B♭maj7 → Fmaj7 → C(add9)
const CHORDS = [
  [50, 57, 60, 64, 65],
  [46, 53, 57, 60, 62],
  [41, 48, 57, 60, 64],
  [48, 55, 62, 64, 67],
];
const ARP = [0, 2, 4, 3, 1, 3, 4, 2];

/** Réverbération : réponse impulsionnelle de bruit qui décroît (salle large et douce). */
function createReverb(ctx, seconds = 3.5) {
  const length = ctx.sampleRate * seconds;
  const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let channel = 0; channel < 2; channel++) {
    const data = impulse.getChannelData(channel);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  }
  return new ConvolverNode(ctx, { buffer: impulse });
}

function createSynth() {
  const ctx = new AudioContext();
  const master = new GainNode(ctx, { gain: 0 });
  const reverb = createReverb(ctx);
  const wet = new GainNode(ctx, { gain: 0.45 });
  master.connect(ctx.destination);
  reverb.connect(wet).connect(master);

  // Écho rythmé (croche pointée) pour l'arpège.
  const delay = new DelayNode(ctx, { delayTime: EIGHTH * 1.5 });
  const feedback = new GainNode(ctx, { gain: 0.35 });
  delay.connect(feedback).connect(delay);
  delay.connect(master);
  delay.connect(reverb);

  const noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
  noise.getChannelData(0).forEach((_, i, data) => (data[i] = Math.random() * 2 - 1));

  const pad = (notes, time, duration) => {
    const filter = new BiquadFilterNode(ctx, { type: 'lowpass', frequency: 700, Q: 0.7 });
    filter.frequency.setValueAtTime(500, time);
    filter.frequency.linearRampToValueAtTime(1100, time + duration / 2);
    filter.frequency.linearRampToValueAtTime(500, time + duration);
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 1.5);
    gain.gain.setValueAtTime(0.05, time + duration - 0.5);
    gain.gain.linearRampToValueAtTime(0, time + duration + 1.5);
    filter.connect(gain);
    gain.connect(master);
    gain.connect(reverb);
    for (const note of notes) {
      for (const detune of [-7, 7]) {
        const osc = new OscillatorNode(ctx, { type: 'sawtooth', frequency: hz(note), detune });
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + duration + 1.6);
      }
    }
  };

  const pluck = (note, time, level) => {
    const osc = new OscillatorNode(ctx, { type: 'triangle', frequency: hz(note) });
    const gain = new GainNode(ctx, { gain: 0 });
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(level, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.7);
    osc.connect(gain);
    gain.connect(delay);
    gain.connect(reverb);
    gain.connect(master);
    osc.start(time);
    osc.stop(time + 0.75);
  };

  const pulse = (time) => {
    const osc = new OscillatorNode(ctx, { type: 'sine', frequency: 110 });
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.25);
    const gain = new GainNode(ctx, { gain: 0.22 });
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.35);
    osc.connect(gain).connect(master);
    osc.start(time);
    osc.stop(time + 0.4);
  };

  const shaker = (time, level) => {
    const source = new AudioBufferSourceNode(ctx, { buffer: noise });
    const filter = new BiquadFilterNode(ctx, { type: 'highpass', frequency: 7000 });
    const gain = new GainNode(ctx, { gain: level });
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);
    source.connect(filter).connect(gain).connect(master);
    source.start(time);
  };

  const playStep = (step, time) => {
    const chord = CHORDS[Math.floor(step / (BAR * 2)) % CHORDS.length];
    const inBar = step % BAR;
    if (step % (BAR * 2) === 0) pad(chord, time, EIGHTH * BAR * 2);
    // Arpège une octave au-dessus ; quelques notes sautées pour respirer.
    if (!(inBar === 7 && step % (BAR * 2) >= BAR)) {
      pluck(chord[ARP[inBar]] + 12, time, inBar % 2 ? 0.035 : 0.055);
    }
    if (inBar === 0 || inBar === 3 || inBar === 4) pulse(time);
    if (inBar % 2) shaker(time, 0.03);
  };

  let timer = null;
  let step = 0;
  let next = 0;

  return {
    async start() {
      await ctx.resume();
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(VOLUME, ctx.currentTime, 0.8);
      if (timer) return;
      next = ctx.currentTime + 0.1;
      timer = setInterval(() => {
        while (next < ctx.currentTime + LOOKAHEAD) {
          playStep(step++, next);
          next += EIGHTH;
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
