import { useState, useRef, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Volume2, Zap, BookOpen, Settings, Download, RefreshCw } from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────

function logFreq(linear: number): number {
  return Math.round(20 * Math.pow(1000, linear));
}

function freqToLinear(hz: number): number {
  return Math.log(hz / 20) / Math.log(1000);
}

function formatFreq(hz: number): string {
  if (hz >= 1000) return `${(hz / 1000).toFixed(hz % 1000 === 0 ? 0 : 2)} kHz`;
  return `${hz} Hz`;
}

// ─── Waveform Canvas ───────────────────────────────────────────────────────

function WaveformPreview({ frequency, dutyCycle, active }: { frequency: number; dutyCycle: number; active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const padX = 12;
    const padY = 16;
    const drawW = W - padX * 2;
    const drawH = H - padY * 2;
    const midY = padY + drawH / 2;
    const topY = padY + 6;
    const botY = padY + drawH - 6;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(padX, padY + drawH * i / 4);
      ctx.lineTo(padX + drawW, padY + drawH * i / 4);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "#334155";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("HIGH", padX + 4, topY + 10);
    ctx.fillText("LOW", padX + 4, botY - 4);

    const nCycles = 4;
    const duty = dutyCycle / 100;
    const cycleW = drawW / nCycles;
    const color = active ? "#22d3ee" : "#334155";

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineJoin = "miter";
    ctx.beginPath();

    let x = padX;
    for (let i = 0; i < nCycles; i++) {
      const hiW = cycleW * duty;
      const loW = cycleW * (1 - duty);

      if (i === 0) ctx.moveTo(x, botY);

      if (hiW > 0.5) {
        ctx.lineTo(x, topY);
        ctx.lineTo(x + hiW, topY);
      }
      if (loW > 0.5) {
        ctx.lineTo(x + hiW, botY);
        ctx.lineTo(x + hiW + loW, botY);
      } else {
        ctx.lineTo(x + cycleW, topY);
      }

      x += cycleW;
    }
    ctx.stroke();

    if (frequency > 0) {
      const period = 1 / frequency;
      const label = period < 0.001 ? `T = ${(period * 1e6).toFixed(1)} µs` : period < 1 ? `T = ${(period * 1000).toFixed(2)} ms` : `T = ${period.toFixed(3)} s`;
      ctx.fillStyle = "#475569";
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(label, padX + drawW - 4, padY + 12);
      ctx.textAlign = "left";
    }
  }, [frequency, dutyCycle, active]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={110}
      data-testid="waveform-canvas"
      className="w-full rounded-md bg-[hsl(215_28%_6%)] border border-border"
      style={{ height: 110 }}
    />
  );
}

// ─── How To Use ────────────────────────────────────────────────────────────

function HowToUse() {
  const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
    <div className="flex gap-3">
      <div className="shrink-0 w-6 h-6 rounded-full bg-[hsl(187_84%_40%/0.2)] border border-[hsl(187_84%_40%/0.4)] flex items-center justify-center text-xs font-bold text-[hsl(187_84%_54%)]">
        {n}
      </div>
      <div className="pt-0.5 space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className="text-xs text-muted-foreground leading-relaxed">{children}</div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Quick Start</p>
        <div className="space-y-4">
          <Step n={1} title="Connect your cable">
            Plug a 3.5 mm audio cable into your computer's headphone jack. Connect the other end to your circuit — MOSFET gate or BJT base via resistor.
          </Step>
          <Step n={2} title="Select the output device">
            Choose your headphone jack from the dropdown — audio routes there directly.
          </Step>
          <Step n={3} title="Set frequency">
            Use the slider or type a value (20 Hz – 20 kHz). <span className="font-medium text-foreground">1 kHz</span> is a good starting point for most loads.
          </Step>
          <Step n={4} title="Set duty cycle">
            Use the slider or type a value. <span className="font-medium text-foreground">50%</span> = symmetric square wave. Stay between <span className="font-medium text-foreground">5% and 95%</span>.
          </Step>
          <Step n={5} title="Set volume to 100%">
            Drag the system volume to maximum for highest gate/base drive.
          </Step>
          <Step n={6} title="Tap Start Output">
            The green <span className="font-medium text-foreground">OUTPUT ACTIVE</span> badge confirms the signal is live.
          </Step>
          <Step n={7} title="Adjust in real time">
            Move the sliders while running — frequency and duty cycle update instantly.
          </Step>
          <Step n={8} title="Tap Stop Output when done">
            Always stop before disconnecting hardware to avoid voltage spikes on inductive loads.
          </Step>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground">Signal Details</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs">
          {([
            ["Output level",    "≈ 0.5 – 1.5 V peak (volume at 100%)"],
            ["Impedance",       "≈ 32 Ω (standard headphone amp)"],
            ["Channels",        "Left and Right both carry the same signal"],
            ["GND connection",  "Sleeve / ring of the 3.5 mm jack"],
            ["Waveform",        "Hard-clipped square wave"],
            ["Frequency range", "20 Hz – 20 kHz"],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k}>
              <p className="text-[hsl(187_84%_54%)] font-medium mb-0.5">{k}</p>
              <p className="text-muted-foreground">{v}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ─── PWA Update Banner ────────────────────────────────────────────────────

function UpdateBanner() {
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.updateSW) setUpdateSW(() => detail.updateSW);
    };
    window.addEventListener("pwa-update-available", handler);
    return () => window.removeEventListener("pwa-update-available", handler);
  }, []);

  if (!updateSW) return null;

  return (
    <div className="mx-4 mt-3 rounded-lg border border-[hsl(30_86%_57%/0.4)] bg-[hsl(30_86%_57%/0.07)] px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <RefreshCw className="w-4 h-4 text-[hsl(30_86%_57%)] shrink-0" />
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">New version available</span> — tap to reload and update
        </p>
      </div>
      <button
        onClick={() => updateSW(true)}
        className="text-xs px-3 py-1.5 rounded bg-[hsl(30_86%_57%/0.2)] border border-[hsl(30_86%_57%/0.4)] text-[hsl(30_86%_57%)] font-semibold hover:bg-[hsl(30_86%_57%/0.3)] transition-colors shrink-0"
      >
        Update
      </button>
    </div>
  );
}

// ─── PWA Install Banner ────────────────────────────────────────────────────

function InstallBanner() {
  const [prompt, setPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!prompt || dismissed) return null;

  const install = async () => {
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
    else setDismissed(true);
  };

  return (
    <div className="mx-4 mt-3 rounded-lg border border-[hsl(187_84%_54%/0.3)] bg-[hsl(187_84%_54%/0.07)] px-4 py-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 min-w-0">
        <Download className="w-4 h-4 text-[hsl(187_84%_54%)] shrink-0" />
        <p className="text-xs text-muted-foreground truncate">
          <span className="font-medium text-foreground">Install app</span> — works offline, no browser needed
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button onClick={install} className="text-xs px-3 py-1.5 rounded bg-[hsl(187_84%_40%)] text-[hsl(215_28%_8%)] font-semibold hover:bg-[hsl(187_84%_35%)] transition-colors">
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">✕</button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────

interface OutputDevice {
  deviceId: string;
  label: string;
}

export default function PWMGenerator() {
  const [freqLinear,  setFreqLinear]  = useState(freqToLinear(1000));
  const [dutyCycle,   setDutyCycle]   = useState(50);
  const [isPlaying,   setIsPlaying]   = useState(false);
  const [devices,     setDevices]     = useState<OutputDevice[]>([]);
  const [deviceId,    setDeviceId]    = useState<string>("default");
  const [freqInput,   setFreqInput]   = useState("1000");
  const [dutyInput,   setDutyInput]   = useState("50.0");
  const [inverted,    setInverted]    = useState(false);
  const [amplitude,   setAmplitude]   = useState(100);
  const [riseTime,    setRiseTime]    = useState(0);
  const [deadBand,    setDeadBand]    = useState(0);
  const [shapeOpen,   setShapeOpen]   = useState(false);

  const frequency     = logFreq(freqLinear);
  const amplitudeGain = (amplitude / 100) * 0.85;
  const alphaRT       = riseTime > 0 ? Math.exp(-2.3 / (riseTime * 1e-6 * 44100)) : 0;
  const deadBandFrac  = deadBand / 100;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodeRef     = useRef<AudioWorkletNode | null>(null);

  useEffect(() => {
    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        const all = await navigator.mediaDevices.enumerateDevices();
        const outs = all
          .filter(d => d.kind === "audiooutput")
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` }));
        if (outs.length) setDevices(outs);
      } catch {
        // no permission — fall back to default device
      }
    }
    loadDevices();
  }, []);

  const sendParam = useCallback((type: string, value: number) => {
    nodeRef.current?.port.postMessage({ type, value });
  }, []);

  const startOutput = useCallback(async () => {
    try {
      const ctx = new AudioContext({ sampleRate: 44100 });

      const workletSrc = `
class PWMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this._frequency = opts.frequency || 1000;
    this._dutyCycle = opts.dutyCycle != null ? opts.dutyCycle : 0.5;
    this._amplitude = opts.amplitude != null ? opts.amplitude : 0.85;
    this._alpha     = opts.alpha     != null ? opts.alpha     : 0;
    this._deadBand  = opts.deadBand  != null ? opts.deadBand  : 0;
    this._phase = 0;
    this._slew  = 0;
    this.port.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === "frequency") this._frequency = Math.max(20, Math.min(20000, value));
      if (type === "dutyCycle") this._dutyCycle = Math.max(0, Math.min(1, value));
      if (type === "amplitude") this._amplitude = Math.max(0, Math.min(1, value));
      if (type === "alpha")     this._alpha     = Math.max(0, Math.min(0.9999, value));
      if (type === "deadBand")  this._deadBand  = Math.max(0, Math.min(0.49, value));
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const numChannels = output.length;
    const blockSize   = output[0].length;
    for (let i = 0; i < blockSize; i++) {
      const period   = sampleRate / this._frequency;
      this._phase    = (this._phase + 1) % period;
      const p    = this._phase;
      const duty = this._dutyCycle;
      const db   = this._deadBand;
      const amp  = this._amplitude;
      const highEnd  = duty * period;
      const dead1End = highEnd + db * 0.5 * period;
      const lowEnd   = period * (1 - db * 0.5);
      let target;
      if      (p < highEnd)  target =  amp;
      else if (p < dead1End) target =  0;
      else if (p < lowEnd)   target = -amp;
      else                   target =  0;
      this._slew = this._alpha * this._slew + (1 - this._alpha) * target;
      for (let ch = 0; ch < numChannels; ch++) output[ch][i] = this._slew;
    }
    return true;
  }
}
registerProcessor("pwm-processor", PWMProcessor);
`;
      const workletUrl = `data:application/javascript;charset=utf-8,${encodeURIComponent(workletSrc)}`;
      await ctx.audioWorklet.addModule(workletUrl);

      const node = new AudioWorkletNode(ctx, "pwm-processor", {
        processorOptions: { frequency, dutyCycle: dutyCycle / 100, amplitude: amplitudeGain, alpha: alphaRT, deadBand: deadBandFrac },
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });

      if (deviceId !== "default" && "setSinkId" in ctx) {
        try { await (ctx as any).setSinkId(deviceId); } catch { /* ignore */ }
      }

      node.connect(ctx.destination);
      audioCtxRef.current = ctx;
      nodeRef.current     = node;
      setIsPlaying(true);
    } catch (err) {
      console.error("Audio start failed:", err);
      alert(`Could not start audio: ${err instanceof Error ? err.message : err}`);
    }
  }, [frequency, dutyCycle, deviceId]);

  const stopOutput = useCallback(() => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsPlaying(false);
  }, []);

  useEffect(() => { if (isPlaying) sendParam("frequency",  frequency); },          [frequency,     isPlaying, sendParam]);
  useEffect(() => { if (isPlaying) sendParam("dutyCycle",  dutyCycle / 100); },    [dutyCycle,     isPlaying, sendParam]);
  useEffect(() => { if (isPlaying) sendParam("amplitude",  amplitudeGain); },      [amplitudeGain, isPlaying, sendParam]);
  useEffect(() => { if (isPlaying) sendParam("alpha",      alphaRT); },            [alphaRT,       isPlaying, sendParam]);
  useEffect(() => { if (isPlaying) sendParam("deadBand",   deadBandFrac); },       [deadBandFrac,  isPlaying, sendParam]);

  useEffect(() => () => { stopOutput(); }, [stopOutput]);

  const handleFreqSlider = (val: number[]) => {
    const lv = val[0];
    setFreqLinear(lv);
    setFreqInput(String(logFreq(lv)));
  };

  const handleFreqInput = (raw: string) => {
    setFreqInput(raw);
    const v = parseInt(raw, 10);
    if (!isNaN(v) && v >= 20 && v <= 20000) setFreqLinear(freqToLinear(v));
  };

  const handleDutySlider = (val: number[]) => {
    setDutyCycle(val[0]);
    setDutyInput(val[0].toFixed(1));
  };

  const handleDutyInput = (raw: string) => {
    setDutyInput(raw);
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0 && v <= 100) setDutyCycle(v);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-4 py-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-[hsl(187_84%_40%/0.15)] border border-[hsl(187_84%_40%/0.3)] shrink-0">
            <Zap className="w-4 h-4 text-[hsl(187_84%_54%)]" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base font-semibold text-foreground tracking-tight truncate">Lars Lentz's PWM Generator</h1>
            <p className="text-[11px] text-muted-foreground hidden sm:block">Square wave via headphone jack · Web Audio API · v1.03</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setShapeOpen(v => !v)}
            className={`text-xs px-2 py-1 rounded border font-medium flex items-center gap-1 transition-colors ${
              shapeOpen
                ? "border-[hsl(187_84%_54%/0.6)] bg-[hsl(187_84%_54%/0.12)] text-[hsl(187_84%_54%)]"
                : "border-border text-muted-foreground hover:border-[hsl(187_84%_54%/0.4)] hover:text-[hsl(187_84%_54%)]"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Wave Shape</span>
          </button>
          <Badge
            data-testid="status-badge"
            variant="outline"
            className={isPlaying
              ? "border-[hsl(142_71%_45%/0.5)] text-[hsl(142_71%_45%)] bg-[hsl(142_71%_45%/0.08)] text-xs"
              : "border-border text-muted-foreground text-xs"
            }
          >
            <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-[hsl(142_71%_45%)] animate-pulse" : "bg-muted-foreground"}`} />
            {isPlaying ? <span className="hidden sm:inline">OUTPUT ACTIVE</span> : <span className="hidden sm:inline">Stopped</span>}
            {isPlaying ? <span className="sm:hidden">ACTIVE</span> : <span className="sm:hidden">Off</span>}
          </Badge>
        </div>
      </header>

      {/* PWA Banners */}
      <UpdateBanner />
      <InstallBanner />

      {/* Body */}
      <main className="flex-1 w-full max-w-2xl mx-auto px-4 py-5">
        <Tabs defaultValue="control">
          <TabsList className="mb-5 bg-card border border-border w-full">
            <TabsTrigger value="control" data-testid="tab-control" className="gap-1.5 flex-1 text-xs sm:text-sm">
              <Zap className="w-3.5 h-3.5" /> PWM Control
            </TabsTrigger>
            <TabsTrigger value="howto" data-testid="tab-howto" className="gap-1.5 flex-1 text-xs sm:text-sm">
              <BookOpen className="w-3.5 h-3.5" /> How to Use
            </TabsTrigger>
          </TabsList>

          {/* ── Control Tab ─────────────────────────────────────────────── */}
          <TabsContent value="control">
            {/* On mobile: stack vertically. On sm+: side by side */}
            <div className="flex flex-col sm:flex-row gap-4 items-start">

              {/* Main controls */}
              <div className="flex-1 min-w-0 space-y-5 w-full">

                {/* Device Selector */}
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5" /> Audio Output Device
                  </label>
                  <Select value={deviceId} onValueChange={setDeviceId} disabled={isPlaying}>
                    <SelectTrigger data-testid="select-device" className="bg-card border-border">
                      <SelectValue placeholder="Default system output" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">Default system output</SelectItem>
                      {devices.map(d => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>{d.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Connect a 3.5mm cable to the jack selected here.
                  </p>
                </div>

                {/* Frequency */}
                <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Frequency</span>
                    <div className="flex items-center gap-2">
                      <input
                        data-testid="input-frequency"
                        type="number"
                        value={freqInput}
                        min={20} max={20000}
                        onChange={e => handleFreqInput(e.target.value)}
                        onBlur={() => setFreqInput(String(frequency))}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-right text-sm font-mono text-[hsl(187_84%_54%)] focus:outline-none focus:border-[hsl(187_84%_54%)]"
                      />
                      <span className="text-sm font-mono text-[hsl(187_84%_54%)] w-10">{frequency >= 1000 ? "kHz" : "Hz"}</span>
                    </div>
                  </div>
                  <div className="py-2">
                    <Slider
                      data-testid="slider-frequency"
                      min={0} max={1} step={0.001}
                      value={[freqLinear]}
                      onValueChange={handleFreqSlider}
                      className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>20 Hz</span>
                    <span className="text-[hsl(187_84%_54%)] font-semibold">{formatFreq(frequency)}</span>
                    <span>20 kHz</span>
                  </div>
                </div>

                {/* Duty Cycle */}
                <div className="space-y-3 rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">Duty Cycle</span>
                      <button
                        data-testid="button-invert"
                        onClick={() => {
                          const flipped = parseFloat((100 - dutyCycle).toFixed(1));
                          setDutyCycle(flipped);
                          setDutyInput(flipped.toFixed(1));
                          setInverted(v => !v);
                        }}
                        className={`text-xs px-2 py-1 rounded border font-medium transition-colors min-h-[32px] ${
                          inverted
                            ? "border-[hsl(187_84%_54%/0.6)] bg-[hsl(187_84%_54%/0.12)] text-[hsl(187_84%_54%)]"
                            : "border-border text-muted-foreground hover:border-[hsl(187_84%_54%/0.4)] hover:text-[hsl(187_84%_54%)]"
                        }`}
                      >
                        {inverted ? "⇄ Inverted" : "⇄ Invert"}
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        data-testid="input-duty"
                        type="number"
                        value={dutyInput}
                        min={0} max={100} step={0.1}
                        onChange={e => handleDutyInput(e.target.value)}
                        onBlur={() => setDutyInput(dutyCycle.toFixed(1))}
                        className="w-20 bg-background border border-border rounded px-2 py-1 text-right text-sm font-mono text-[hsl(187_84%_54%)] focus:outline-none focus:border-[hsl(187_84%_54%)]"
                      />
                      <span className="text-sm font-mono text-[hsl(187_84%_54%)] w-6">%</span>
                    </div>
                  </div>
                  <div className="py-2">
                    <Slider
                      data-testid="slider-duty"
                      min={0} max={100} step={0.1}
                      value={[dutyCycle]}
                      onValueChange={handleDutySlider}
                      className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground font-mono">
                    <span>0%</span>
                    <span className="text-[hsl(187_84%_54%)] font-semibold">{dutyCycle.toFixed(1)}%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Waveform Preview */}
                <div className="space-y-2">
                  <span className="text-sm text-muted-foreground">Waveform (for reference)</span>
                  <WaveformPreview frequency={frequency} dutyCycle={dutyCycle} active={isPlaying} />
                </div>

                {/* Start / Stop */}
                <div className="flex items-center gap-4 pt-1">
                  <Button
                    data-testid="button-toggle"
                    size="lg"
                    onClick={isPlaying ? stopOutput : startOutput}
                    className={
                      isPlaying
                        ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 flex-1 min-h-[52px] text-base"
                        : "bg-[hsl(187_84%_40%)] hover:bg-[hsl(187_84%_35%)] text-[hsl(215_28%_8%)] gap-2 flex-1 min-h-[52px] text-base"
                    }
                  >
                    {isPlaying
                      ? <><Square className="w-5 h-5 fill-current" /> Stop Output</>
                      : <><Play  className="w-5 h-5 fill-current" /> Start Output</>
                    }
                  </Button>
                  {isPlaying && (
                    <div data-testid="readout-active" className="text-sm font-mono text-muted-foreground text-right shrink-0">
                      <div className="text-[hsl(187_84%_54%)]">{formatFreq(frequency)}</div>
                      <div>{dutyCycle.toFixed(1)}% duty</div>
                    </div>
                  )}
                </div>

                {/* Tips */}
                <div className="rounded-lg border border-[hsl(30_86%_57%/0.2)] bg-[hsl(30_86%_57%/0.05)] p-3 space-y-1">
                  <p className="text-xs text-[hsl(30_86%_57%)] font-medium">Tips for best results</p>
                  <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                    <li>Set volume to <strong className="text-foreground">100%</strong> for maximum gate drive</li>
                    <li>Use duty cycle between <strong className="text-foreground">5% and 95%</strong></li>
                    <li>Connect the <strong className="text-foreground">sleeve/ring</strong> to circuit GND</li>
                    <li>Works in Chrome, Edge, and Firefox</li>
                  </ul>
                </div>
              </div>{/* end main col */}

              {/* ── Wave Shape Panel ── */}
              {shapeOpen && (
                <div className="w-full sm:w-48 sm:shrink-0 space-y-3">
                  <p className="text-xs font-semibold text-foreground flex items-center gap-1.5 pb-0.5">
                    <Settings className="w-3.5 h-3.5 text-[hsl(187_84%_54%)]" /> Wave Shape
                  </p>

                  {/* Amplitude */}
                  <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Amplitude</span>
                      <span className="text-xs font-mono text-[hsl(187_84%_54%)]">{amplitude}%</span>
                    </div>
                    <div className="py-1">
                      <Slider min={0} max={100} step={1} value={[amplitude]}
                        onValueChange={v => setAmplitude(v[0])}
                        className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>0%</span><span>100%</span>
                    </div>
                  </div>

                  {/* Rise Time */}
                  <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Rise Time</span>
                      <span className="text-xs font-mono text-[hsl(187_84%_54%)]">{riseTime} µs</span>
                    </div>
                    <div className="py-1">
                      <Slider min={0} max={500} step={5} value={[riseTime]}
                        onValueChange={v => setRiseTime(v[0])}
                        className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>0 µs</span><span>500 µs</span>
                    </div>
                  </div>

                  {/* Dead Band */}
                  <div className="rounded-lg border border-border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-foreground">Dead Band</span>
                      <span className="text-xs font-mono text-[hsl(187_84%_54%)]">{Number.isInteger(deadBand) ? deadBand : deadBand.toFixed(1)}%</span>
                    </div>
                    <div className="py-1">
                      <Slider min={0} max={20} step={0.5} value={[deadBand]}
                        onValueChange={v => setDeadBand(v[0])}
                        className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:h-5 [&_[role=slider]]:w-5"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                      <span>0%</span><span>20%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => { setAmplitude(100); setRiseTime(0); setDeadBand(0); }}
                    className="w-full text-xs px-2 py-2 rounded border border-border text-muted-foreground hover:border-[hsl(187_84%_54%/0.4)] hover:text-[hsl(187_84%_54%)] transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>
              )}
            </div>{/* end flex */}
          </TabsContent>

          {/* ── How To Use Tab ──────────────────────────────────────────── */}
          <TabsContent value="howto">
            <HowToUse />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
