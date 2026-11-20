const effects = {
  mote_picked: [[659, .09], [988, .12]],
  lantern_lit: [[392, .15], [523, .19], [659, .22], [784, .36]],
  refuel: [[523, .13], [659, .16]],
  lantern_out: [[294, .14], [196, .21]],
  pulse: [[262, .16], [196, .23]],
  player_hit: [[123, .17], [82, .22]],
  jump: [[330, .09], [494, .14]],
  dash: [[220, .08], [523, .11]],
  won: [[392, .18], [523, .2], [659, .22], [1047, .46]],
  lost: [[349, .18], [294, .2], [196, .42]],
  shade_spawned: [[131, .19], [147, .24]],
  countdown: [[523, .1]],
  wind: [[196, .32], [247, .48]],
  charm_picked: [[523, .1], [784, .1], [1047, .21]],
  drifter_steal: [[330, .13], [247, .18]]
};
const chords = [[130.81, 196, 261.63], [110, 164.81, 261.63], [146.83, 220, 293.66], [98, 146.83, 246.94]];

export class GameAudio {
  constructor() {
    this.nextChord = 0;
    this.chord = 0;
  }

  enable(volume) {
    if (!this.context) {
      const Context = window.AudioContext ?? window.webkitAudioContext;
      if (!Context) return;
      this.context = new Context();
      this.master = this.context.createGain();
      this.master.connect(this.context.destination);
    }
    this.volume(volume);
    this.context.resume().catch(() => {});
  }

  volume(value) {
    if (this.master) this.master.gain.value = value / 100;
  }

  note(frequency, time, duration, gain, type = 'sine') {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0.0001, time);
    envelope.gain.exponentialRampToValueAtTime(gain, time + Math.min(.075, duration / 3));
    envelope.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    oscillator.connect(envelope).connect(this.master);
    oscillator.start(time);
    oscillator.stop(time + duration + .01);
    oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
  }

  play(name) {
    if (this.context?.state !== 'running' || !effects[name]) return;
    const now = this.context.currentTime;
    effects[name].forEach(([frequency, duration], index) => {
      this.note(frequency, now + index * .085, duration, .085, name === 'player_hit' ? 'triangle' : 'sine');
    });
  }

  ambience() {
    if (this.context?.state !== 'running' || this.context.currentTime < this.nextChord) return;
    const now = this.context.currentTime;
    chords[this.chord++ % chords.length].forEach((frequency, index) => this.note(frequency, now, 3.6, .021 - index * .004));
    this.nextChord = now + 2.9;
  }
}
