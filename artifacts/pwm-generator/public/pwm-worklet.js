/**
 * PWM AudioWorkletProcessor
 * Generates a square wave with variable frequency and duty cycle.
 * Runs on the audio rendering thread for sample-accurate output.
 */
class PWMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this._frequency  = opts.frequency  || 1000;
    this._dutyCycle  = opts.dutyCycle  || 0.5;
    this._phase      = 0;
    this._amplitude  = 0.85;

    this.port.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === "frequency")  this._frequency  = Math.max(20, Math.min(20000, value));
      if (type === "dutyCycle")  this._dutyCycle  = Math.max(0, Math.min(1, value));
    };
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;

    const numChannels = output.length;
    const blockSize   = output[0].length;

    for (let i = 0; i < blockSize; i++) {
      const period = sampleRate / this._frequency;
      this._phase  = (this._phase + 1) % period;
      const sample = this._phase < period * this._dutyCycle
        ? this._amplitude
        : -this._amplitude;
      for (let ch = 0; ch < numChannels; ch++) {
        output[ch][i] = sample;
      }
    }

    return true; // keep processor alive
  }
}

registerProcessor("pwm-processor", PWMProcessor);
