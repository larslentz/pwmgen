import { useState, useRef, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Square, Volume2, Zap, Cpu, BookOpen } from "lucide-react";

// ─── Helpers ───────────────────────────────────────────────────────────────

function logFreq(linear: number): number {
  // maps 0..1 slider → 20..20000 Hz (logarithmic)
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

    // Grid
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

    // Labels
    ctx.fillStyle = "#334155";
    ctx.font = "10px 'JetBrains Mono', monospace";
    ctx.fillText("HIGH", padX + 4, topY + 10);
    ctx.fillText("LOW", padX + 4, botY - 4);

    // Waveform
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

    // Period label
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

// ─── Hardware Guide ────────────────────────────────────────────────────────

const MOSFET_GUIDE = `CIRCUIT A — IRLZ44N MOSFET (Recommended)
Logic-level gate: works directly from the headphone/audio jack

  12 V (+) ──────────────────────── Load (+)
                                       │
                                     [LOAD]  ← motor, LED strip, relay
                                       │
  IRLZ44N:                           Drain (D)
                                       │
   Audio L/R ──[10 kΩ]──── Gate (G) ──┤  IRLZ44N
                                       │
   Audio GND ──────────── Source (S) ──┘
        │                              │
        └──────────────────────────────┴──── 12 V GND (-)

  Recommended extras:
    • 10 kΩ pull-down between Gate and Source (clean OFF state)
    • Flyback diode across load if inductive (motor, solenoid, relay)

  Notes:
    • IRLZ44N Vgs(th) ≈ 1–2 V. The audio output (~1 Vpp) may only
      partially open the gate at low volume. Set system volume to 100%.
    • Max drain current: 47 A. Rds(on): 22 mΩ. Add heatsink above 5 A.
    • Best working range: 5%–95% duty cycle (audio amp is AC-coupled;
      near 0% or 100% the signal drifts slowly rather than holding DC).

─────────────────────────────────────────────────────────────────────

CIRCUIT B — NPN BJT: 2N2222 / BC547 (Alternative)
Works well for small loads (fans, LEDs, small motors < 600 mA)

  12 V (+) ──────────────────────── Load (+)
                                       │
                                     [LOAD]
                                       │
                                    Collector (C)
                                       │
   Audio L/R ──[1 kΩ]──── Base (B) ───┤  2N2222
                                       │
   Audio GND ──────────── Emitter (E)──┘
        │                              │
        └──────────────────────────────┴──── 12 V GND (-)

  Notes:
    • 2N2222: max Ic = 600 mA.  BC547: max Ic = 100 mA.
    • For loads > 600 mA: use TIP120 Darlington (same pinout, higher current).
    • Base resistor (1 kΩ) limits current — do not omit.

─────────────────────────────────────────────────────────────────────

AUDIO OUTPUT CHARACTERISTICS

    Peak voltage:    ≈ 0.5 – 1.5 V  (set Windows volume to 100%)
    Impedance:       ≈ 32 Ω  (standard headphone amp)
    Frequency range: 20 Hz – 20,000 Hz
    Waveform:        Square (hard-clipped)

  ⚠  Use the LEFT or RIGHT channel — both carry the same signal.
  ⚠  Always connect the audio GND (sleeve / ring) to the circuit GND.
  ⚠  Set Windows volume to 100% for maximum gate/base drive.
  ⚠  Keep duty cycle between 5% and 95% for best results.`;

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
      {/* Steps */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-4">
        <p className="text-sm font-semibold text-foreground">Quick Start</p>
        <div className="space-y-4">
          <Step n={1} title="Connect your cable">
            Plug a 3.5 mm audio cable into your computer's headphone jack. Connect the other end to your circuit — MOSFET gate or BJT base via resistor.
          </Step>
          <Step n={2} title="Select the output device">
            <span className="font-medium text-foreground">Online (this app):</span> choose your headphone jack from the dropdown — audio routes there directly.<br />
            <span className="font-medium text-foreground">Offline file:</span> the dropdown is reference only. Go to <em>Windows Sound → Playback</em>, right-click your jack → <em>Set as Default Device</em>.
          </Step>
          <Step n={3} title="Set frequency">
            Use the slider or type a value (20 Hz – 20 kHz). This is the PWM switching rate. <span className="font-medium text-foreground">1 kHz</span> is a good starting point for most loads.
          </Step>
          <Step n={4} title="Set duty cycle">
            Use the slider or type a value. <span className="font-medium text-foreground">50%</span> = symmetric square wave. Stay between <span className="font-medium text-foreground">5% and 95%</span> — near the extremes the AC-coupled audio amp drifts toward zero.
          </Step>
          <Step n={5} title="Set Windows volume to 100%">
            Click the speaker icon in the taskbar and drag volume to maximum. This gives your MOSFET or BJT the highest gate/base drive.
          </Step>
          <Step n={6} title="Click Start Output">
            The green <span className="font-medium text-foreground">OUTPUT ACTIVE</span> badge confirms the signal is live. The waveform preview turns cyan.
          </Step>
          <Step n={7} title="Adjust in real time">
            Move the sliders or type new values while running — frequency and duty cycle update instantly with no dropout.
          </Step>
          <Step n={8} title="Click Stop Output when done">
            Always stop before disconnecting hardware to avoid voltage spikes on inductive loads.
          </Step>
        </div>
      </div>

      {/* Signal details */}
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

      {/* Next steps callout */}
      <div className="rounded-lg border border-[hsl(30_86%_57%/0.2)] bg-[hsl(30_86%_57%/0.05)] p-3">
        <p className="text-xs text-[hsl(30_86%_57%)] font-medium mb-1">Next steps</p>
        <p className="text-xs text-muted-foreground">
          See the <span className="font-medium text-foreground">Hardware Guide</span> tab for complete MOSFET (IRLZ44N) and BJT (2N2222) wiring circuits, component values, and safety notes.
        </p>
      </div>
    </div>
  );
}

// ─── Hardware Guide ────────────────────────────────────────────────────────

function HardwareGuide() {
  return (
    <div className="rounded-lg border border-border bg-[hsl(215_28%_6%)] p-4 overflow-auto max-h-[520px]" data-testid="hardware-guide">
      <pre className="text-xs font-mono leading-relaxed whitespace-pre text-muted-foreground">
        {MOSFET_GUIDE.split("\n").map((line, i) => {
          const isHeading = line.startsWith("CIRCUIT") || line.startsWith("AUDIO OUTPUT");
          const isWarn    = line.startsWith("  ⚠");
          return (
            <span
              key={i}
              className={
                isHeading ? "text-[hsl(187_84%_54%)] font-semibold" :
                isWarn    ? "text-[hsl(30_86%_57%)]" :
                ""
              }
            >
              {line + "\n"}
            </span>
          );
        })}
      </pre>
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

  const frequency     = logFreq(freqLinear);
  const effectiveDuty = inverted ? 100 - dutyCycle : dutyCycle;

  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodeRef     = useRef<AudioWorkletNode | null>(null);

  // Enumerate output devices — only works in secure contexts (HTTPS / localhost)
  useEffect(() => {
    async function loadDevices() {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        // Try to get a mic permission so Chrome populates device labels
        await navigator.mediaDevices.getUserMedia({ audio: true }).catch(() => {});
        const all = await navigator.mediaDevices.enumerateDevices();
        const outs = all
          .filter(d => d.kind === "audiooutput")
          .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${d.deviceId.slice(0, 6)}` }));
        if (outs.length) setDevices(outs);
      } catch {
        // file:// context or no permission — fall back to default device
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

      // Inline the worklet as a Blob URL so it works from file:// (no server needed)
      const workletSrc = `
class PWMProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const opts = (options && options.processorOptions) || {};
    this._frequency = opts.frequency || 1000;
    this._dutyCycle = opts.dutyCycle || 0.5;
    this._phase = 0;
    this._amplitude = 0.85;
    this.port.onmessage = (e) => {
      const { type, value } = e.data;
      if (type === "frequency") this._frequency = Math.max(20, Math.min(20000, value));
      if (type === "dutyCycle") this._dutyCycle = Math.max(0, Math.min(1, value));
    };
  }
  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const numChannels = output.length;
    const blockSize = output[0].length;
    for (let i = 0; i < blockSize; i++) {
      const period = sampleRate / this._frequency;
      this._phase = (this._phase + 1) % period;
      const sample = this._phase < period * this._dutyCycle ? this._amplitude : -this._amplitude;
      for (let ch = 0; ch < numChannels; ch++) output[ch][i] = sample;
    }
    return true;
  }
}
registerProcessor("pwm-processor", PWMProcessor);
`;
      // Use data: URI instead of blob: URL — blob:null/ URLs are blocked in file:// context
      const workletUrl = `data:application/javascript;charset=utf-8,${encodeURIComponent(workletSrc)}`;
      await ctx.audioWorklet.addModule(workletUrl);

      const node = new AudioWorkletNode(ctx, "pwm-processor", {
        processorOptions: { frequency, dutyCycle: effectiveDuty / 100 },
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });

      // Set output device if browser supports setSinkId
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
  }, [frequency, dutyCycle, effectiveDuty, deviceId]);

  const stopOutput = useCallback(() => {
    nodeRef.current?.disconnect();
    nodeRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsPlaying(false);
  }, []);

  // Live-update processor when sliders change while playing
  useEffect(() => { if (isPlaying) sendParam("frequency", frequency); },  [frequency, isPlaying, sendParam]);
  useEffect(() => { if (isPlaying) sendParam("dutyCycle", effectiveDuty / 100); }, [effectiveDuty, isPlaying, sendParam]);

  // Sync input box display when invert is toggled
  useEffect(() => {
    setDutyInput((inverted ? 100 - dutyCycle : dutyCycle).toFixed(1));
  }, [inverted]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
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
    setDutyInput(inverted ? (100 - val[0]).toFixed(1) : val[0].toFixed(1));
  };

  const handleDutyInput = (raw: string) => {
    setDutyInput(raw);
    const v = parseFloat(raw);
    if (!isNaN(v) && v >= 0 && v <= 100) setDutyCycle(inverted ? 100 - v : v);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[hsl(187_84%_40%/0.15)] border border-[hsl(187_84%_40%/0.3)]">
            <Zap className="w-5 h-5 text-[hsl(187_84%_54%)]" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Lars Lentz's PWM Generator</h1>
            <p className="text-xs text-muted-foreground">Square wave via headphone jack · Web Audio API · v1.03</p>
          </div>
        </div>
        <Badge
          data-testid="status-badge"
          variant="outline"
          className={isPlaying
            ? "border-[hsl(142_71%_45%/0.5)] text-[hsl(142_71%_45%)] bg-[hsl(142_71%_45%/0.08)]"
            : "border-border text-muted-foreground"
          }
        >
          <span className={`mr-1.5 inline-block w-1.5 h-1.5 rounded-full ${isPlaying ? "bg-[hsl(142_71%_45%)] animate-pulse" : "bg-muted-foreground"}`} />
          {isPlaying ? "OUTPUT ACTIVE" : "Stopped"}
        </Badge>
      </header>

      {/* Body */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-6 py-8">
        <Tabs defaultValue="control">
          <TabsList className="mb-6 bg-card border border-border">
            <TabsTrigger value="control" data-testid="tab-control" className="gap-2">
              <Zap className="w-3.5 h-3.5" /> PWM Control
            </TabsTrigger>
            <TabsTrigger value="hardware" data-testid="tab-hardware" className="gap-2">
              <Cpu className="w-3.5 h-3.5" /> Hardware Guide
            </TabsTrigger>
            <TabsTrigger value="howto" data-testid="tab-howto" className="gap-2">
              <BookOpen className="w-3.5 h-3.5" /> How to Use
            </TabsTrigger>
          </TabsList>

          {/* ── Control Tab ─────────────────────────────────────────────── */}
          <TabsContent value="control" className="space-y-6">

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
                Connect headphones or a 3.5mm cable to the jack selected here.
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
                    className="w-24 bg-background border border-border rounded px-2 py-1 text-right text-sm font-mono text-[hsl(187_84%_54%)] focus:outline-none focus:border-[hsl(187_84%_54%)]"
                  />
                  <span className="text-sm font-mono text-[hsl(187_84%_54%)] w-12">{frequency >= 1000 ? "kHz" : "Hz"}</span>
                </div>
              </div>
              <Slider
                data-testid="slider-frequency"
                min={0} max={1} step={0.001}
                value={[freqLinear]}
                onValueChange={handleFreqSlider}
                className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)]"
              />
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
                    onClick={() => setInverted(v => !v)}
                    className={`text-xs px-2 py-0.5 rounded border font-medium transition-colors ${
                      inverted
                        ? "border-[hsl(187_84%_54%/0.6)] bg-[hsl(187_84%_54%/0.12)] text-[hsl(187_84%_54%)]"
                        : "border-border text-muted-foreground hover:border-[hsl(187_84%_54%/0.4)] hover:text-[hsl(187_84%_54%)]"
                    }`}
                  >
                    {inverted ? "⇄ Scale Inverted" : "⇄ Invert Scale Display"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    data-testid="input-duty"
                    type="number"
                    value={dutyInput}
                    min={0} max={100} step={0.1}
                    onChange={e => handleDutyInput(e.target.value)}
                    onBlur={() => setDutyInput(effectiveDuty.toFixed(1))}
                    className="w-24 bg-background border border-border rounded px-2 py-1 text-right text-sm font-mono text-[hsl(187_84%_54%)] focus:outline-none focus:border-[hsl(187_84%_54%)]"
                  />
                  <span className="text-sm font-mono text-[hsl(187_84%_54%)] w-12">%</span>
                </div>
              </div>
              <Slider
                data-testid="slider-duty"
                min={0} max={100} step={0.1}
                value={[dutyCycle]}
                onValueChange={handleDutySlider}
                className="[&_[role=slider]]:bg-[hsl(187_84%_40%)] [&_[role=slider]]:border-[hsl(187_84%_54%)] [&_.bg-primary]:bg-[hsl(187_84%_40%)]"
              />
              <div className="flex justify-between text-xs text-muted-foreground font-mono">
                <span>{inverted ? "100%" : "0%"}</span>
                <span className="text-[hsl(187_84%_54%)] font-semibold">
                  {effectiveDuty.toFixed(1)}%
                  {inverted && <span style={{color:"#cbd5e1",fontWeight:400}}> ({dutyCycle.toFixed(1)}%)</span>}
                </span>
                <span>{inverted ? "0%" : "100%"}</span>
              </div>
            </div>

            {/* Waveform Preview */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Waveform Representation (for reference)</span>
                {inverted && <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-[hsl(187_84%_54%/0.1)] border border-[hsl(187_84%_54%/0.3)] text-[hsl(187_84%_54%)]">INVERTED</span>}
              </div>
              <WaveformPreview frequency={frequency} dutyCycle={effectiveDuty} active={isPlaying} />
            </div>

            {/* Start / Stop */}
            <div className="flex items-center gap-4 pt-2">
              <Button
                data-testid="button-toggle"
                size="lg"
                onClick={isPlaying ? stopOutput : startOutput}
                className={
                  isPlaying
                    ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground gap-2 flex-1"
                    : "bg-[hsl(187_84%_40%)] hover:bg-[hsl(187_84%_35%)] text-[hsl(215_28%_8%)] gap-2 flex-1"
                }
              >
                {isPlaying
                  ? <><Square className="w-4 h-4 fill-current" /> Stop Output</>
                  : <><Play  className="w-4 h-4 fill-current" /> Start Output</>
                }
              </Button>
              {isPlaying && (
                <div data-testid="readout-active" className="text-sm font-mono text-muted-foreground text-right shrink-0">
                  <div className="text-[hsl(187_84%_54%)]">{formatFreq(frequency)}</div>
                  <div>{effectiveDuty.toFixed(1)}% duty</div>
                </div>
              )}
            </div>

            {/* Tips */}
            <div className="rounded-lg border border-[hsl(30_86%_57%/0.2)] bg-[hsl(30_86%_57%/0.05)] p-3 space-y-1">
              <p className="text-xs text-[hsl(30_86%_57%)] font-medium">Tips for best results</p>
              <ul className="text-xs text-muted-foreground space-y-0.5 list-disc list-inside">
                <li>Set system volume to <strong className="text-foreground">100%</strong> for maximum gate drive</li>
                <li>Use duty cycle between <strong className="text-foreground">5% and 95%</strong> (audio amp is AC-coupled near extremes)</li>
                <li>Connect the <strong className="text-foreground">sleeve/ring</strong> of the jack to circuit GND</li>
                <li>Works in Chrome, Edge, and Firefox — enable autoplay if prompted</li>
              </ul>
            </div>
          </TabsContent>

          {/* ── Hardware Tab ────────────────────────────────────────────── */}
          <TabsContent value="hardware">
            <HardwareGuide />
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
