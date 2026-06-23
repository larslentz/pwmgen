"""
Audio PWM Generator
Generates a PWM square wave via the laptop's audio/headphone jack.
Frequency: 20 Hz – 20,000 Hz | Duty Cycle: 0 – 100%
"""

import tkinter as tk
from tkinter import ttk, font as tkfont
import numpy as np
import sounddevice as sd
import threading
import math

SAMPLE_RATE = 44100
AMPLITUDE = 0.85
BLOCK_SIZE = 512

# ─────────────────────────────────────────────────────────────────────────────
# PWM Engine
# ─────────────────────────────────────────────────────────────────────────────

class PWMEngine:
    def __init__(self):
        self.stream = None
        self.running = False
        self._lock = threading.Lock()
        self._frequency = 1000.0
        self._duty_cycle = 0.50
        self._sample_index = 0.0

    @property
    def frequency(self):
        with self._lock:
            return self._frequency

    @frequency.setter
    def frequency(self, val):
        with self._lock:
            self._frequency = float(max(20.0, min(20000.0, val)))

    @property
    def duty_cycle(self):
        with self._lock:
            return self._duty_cycle

    @duty_cycle.setter
    def duty_cycle(self, pct):
        with self._lock:
            self._duty_cycle = float(max(0.0, min(100.0, pct))) / 100.0

    def _callback(self, outdata, frames, time_info, status):
        with self._lock:
            freq = self._frequency
            duty = self._duty_cycle

        period = SAMPLE_RATE / freq
        idx = np.arange(frames, dtype=np.float64) + self._sample_index
        phase = idx % period
        self._sample_index = (self._sample_index + frames) % period

        signal = np.where(phase < period * duty, AMPLITUDE, -AMPLITUDE).astype(np.float32)

        outdata[:, 0] = signal
        if outdata.shape[1] > 1:
            outdata[:, 1] = signal

    def start(self, device_index=None):
        if self.running:
            return
        self._sample_index = 0.0
        try:
            self.stream = sd.OutputStream(
                device=device_index,
                samplerate=SAMPLE_RATE,
                channels=2,
                dtype="float32",
                callback=self._callback,
                blocksize=BLOCK_SIZE,
            )
            self.stream.start()
            self.running = True
        except Exception as exc:
            self.stream = None
            raise RuntimeError(f"Could not open audio device: {exc}") from exc

    def stop(self):
        if self.stream:
            try:
                self.stream.stop()
                self.stream.close()
            except Exception:
                pass
            self.stream = None
        self.running = False


# ─────────────────────────────────────────────────────────────────────────────
# Waveform Preview Canvas
# ─────────────────────────────────────────────────────────────────────────────

class WaveformCanvas(tk.Canvas):
    PAD_X = 14
    PAD_Y = 12
    LINE_COLOR_ON  = "#22d3ee"
    LINE_COLOR_OFF = "#334155"
    GRID_COLOR     = "#1e293b"
    BG_COLOR       = "#0f172a"

    def __init__(self, parent, **kw):
        super().__init__(parent, bg=self.BG_COLOR, highlightthickness=0, **kw)
        self._freq = 1000.0
        self._duty = 0.50
        self.bind("<Configure>", lambda _: self._draw())
        self._draw()

    def update_wave(self, freq, duty_pct):
        self._freq = freq
        self._duty = duty_pct / 100.0
        self._draw()

    def _draw(self):
        self.delete("all")
        w = self.winfo_width()
        h = self.winfo_height()
        if w < 10 or h < 10:
            return

        px, py = self.PAD_X, self.PAD_Y
        draw_w = w - 2 * px
        draw_h = h - 2 * py
        mid_y  = py + draw_h / 2
        top_y  = py + 4
        bot_y  = py + draw_h - 4

        # Grid lines
        for i in range(1, 4):
            y = py + draw_h * i / 4
            self.create_line(px, y, px + draw_w, y, fill=self.GRID_COLOR, dash=(3, 5))

        # Zero-line
        self.create_line(px, mid_y, px + draw_w, mid_y, fill="#1e293b")

        # Cycle count — show 2–6 cycles depending on duty
        n_cycles = 4
        cycle_w = draw_w / n_cycles
        duty = self._duty
        color = self.LINE_COLOR_ON if self._freq > 0 else self.LINE_COLOR_OFF
        x = px
        points = []
        for _ in range(n_cycles):
            high_w = cycle_w * duty
            low_w  = cycle_w * (1 - duty)

            if high_w < 1:
                high_w = 0
            if low_w < 1:
                low_w = 0

            if not points:
                points.append((x, bot_y))

            if high_w > 0:
                points.append((x, top_y))
                points.append((x + high_w, top_y))

            if low_w > 0:
                if high_w == 0:
                    points.append((x, bot_y))
                else:
                    points.append((x + high_w, bot_y))
                points.append((x + high_w + low_w, bot_y))

            x += cycle_w

        if len(points) >= 2:
            flat = [coord for pt in points for coord in pt]
            self.create_line(*flat, fill=color, width=2, joinstyle="miter")

        # Labels
        self.create_text(px + 2, py + 2,  anchor="nw", text="HIGH", fill="#64748b", font=("Consolas", 7))
        self.create_text(px + 2, bot_y - 2, anchor="sw", text="LOW",  fill="#64748b", font=("Consolas", 7))


# ─────────────────────────────────────────────────────────────────────────────
# Hardware Guide
# ─────────────────────────────────────────────────────────────────────────────

MOSFET_GUIDE = """\
┌─────────────────────────────────────────────────────────────┐
│  CIRCUIT A — IRLZ44N MOSFET (Recommended)                   │
│  Logic-level gate: works directly from headphone jack        │
└─────────────────────────────────────────────────────────────┘

  12 V (+) ────────────────────────── Load (+)
                                         │
                                       [LOAD]   ← motor, LED
                                         │        strip, relay…
  IRLZ44N:                             Drain (D)
                                         │
   Headphone L/R ──[10 kΩ]──── Gate (G)─┤  IRLZ44N
                                         │
   Headphone GND ──────────── Source (S)─┘
         │                               │
         └───────────────────────────────┴──── 12 V GND (-)

  Extra components (recommended):
    • 10 kΩ resistor  — between headphone output and Gate (limits current)
    • 10 kΩ pull-down — between Gate and Source (ensures clean OFF state)
    • Flyback diode   — across the load if it is inductive (motor, solenoid)

  Notes:
    • IRLZ44N Vgs(th) ≈ 1–2 V  →  audio signal (~1 Vpp) may only partially
      turn it on. A single AA battery (1.5 V) in series with the headphone
      signal (see biasing note below) fully saturates the gate.
    • Biasing: add a 10 kΩ/10 kΩ voltage divider from the 12 V rail to add
      ~0.75 V DC offset, OR set duty cycle > 0 and keep signal amplitude high.
    • Max drain current: 47 A (TO-220).  Rds(on): 22 mΩ. Heatsink if > 5 A.


┌─────────────────────────────────────────────────────────────┐
│  CIRCUIT B — NPN BJT (2N2222 / BC547)                       │
│  Cheaper; needs ~0.6 V to switch — works with audio signal  │
└─────────────────────────────────────────────────────────────┘

  12 V (+) ────────────────────────── Load (+)
                                         │
                                       [LOAD]
                                         │
                                      Collector (C)
                                         │
   Headphone L/R ──[1 kΩ]──── Base (B) ─┤  2N2222
                                         │
   Headphone GND ──────────── Emitter (E)┘
         │                               │
         └───────────────────────────────┴──── 12 V GND (-)

  Extra components:
    • 1 kΩ base resistor  — between headphone output and Base
    • Flyback diode        — across load if inductive
    • For loads > 600 mA: use a power Darlington (TIP120) instead

  Notes:
    • 2N2222: max Ic = 600 mA.  BC547: max Ic = 100 mA.
    • Good for small loads (fans, small motors, LED arrays < 500 mA).
    • BJT operates as a switch — audio signal drives base on/off cleanly.


┌─────────────────────────────────────────────────────────────┐
│  AUDIO SIGNAL CHARACTERISTICS                               │
└─────────────────────────────────────────────────────────────┘

    Output voltage:  ≈ 0.5 – 1.5 V peak (depends on OS volume setting)
    Impedance:       ≈ 32 Ω (typical headphone amp output)
    Frequency range: 20 Hz – 20,000 Hz (audio band)
    Waveform:        Square wave (hard-clipped)

  ⚠  Set Windows volume to 100% for maximum gate drive.
  ⚠  Use the LEFT or RIGHT channel — both carry identical signal.
  ⚠  The signal is AC-coupled inside most headphone amps.
     This means a 0% duty cycle gives a slow drift to 0 V, not a
     clean DC low. Best working range: 5% – 95% duty cycle.
  ⚠  Always connect signal GND (headphone sleeve) to circuit GND.
"""


# ─────────────────────────────────────────────────────────────────────────────
# Main Application Window
# ─────────────────────────────────────────────────────────────────────────────

class App(tk.Tk):
    # Colour palette
    C_BG       = "#0f172a"
    C_SURFACE  = "#1e293b"
    C_BORDER   = "#334155"
    C_TEXT     = "#f1f5f9"
    C_MUTED    = "#94a3b8"
    C_ACCENT   = "#22d3ee"
    C_GREEN    = "#4ade80"
    C_RED      = "#f87171"
    C_ORANGE   = "#fb923c"

    def __init__(self):
        super().__init__()
        self.engine = PWMEngine()
        self.title("Audio PWM Generator")
        self.resizable(True, True)
        self.minsize(560, 580)
        self.configure(bg=self.C_BG)

        self._freq_var  = tk.DoubleVar(value=1000.0)
        self._duty_var  = tk.DoubleVar(value=50.0)
        self._freq_entry_var = tk.StringVar(value="1000")
        self._duty_entry_var = tk.StringVar(value="50.0")
        self._device_var = tk.StringVar()
        self._status_var = tk.StringVar(value="Stopped")

        self._devices = []
        self._build_styles()
        self._build_ui()
        self._populate_devices()
        self._update_status_bar()
        self.protocol("WM_DELETE_WINDOW", self._on_close)

    # ── Styles ──────────────────────────────────────────────────────────────

    def _build_styles(self):
        style = ttk.Style(self)
        style.theme_use("clam")

        style.configure("App.TFrame",        background=self.C_BG)
        style.configure("Surface.TFrame",    background=self.C_SURFACE)
        style.configure("App.TLabel",        background=self.C_BG,      foreground=self.C_TEXT,  font=("Segoe UI", 10))
        style.configure("Muted.TLabel",      background=self.C_BG,      foreground=self.C_MUTED, font=("Segoe UI", 9))
        style.configure("Surface.TLabel",    background=self.C_SURFACE, foreground=self.C_TEXT,  font=("Segoe UI", 10))
        style.configure("Title.TLabel",      background=self.C_BG,      foreground=self.C_TEXT,  font=("Segoe UI", 13, "bold"))
        style.configure("Value.TLabel",      background=self.C_BG,      foreground=self.C_ACCENT,font=("Consolas", 12, "bold"))
        style.configure("Status.TLabel",     background=self.C_SURFACE, foreground=self.C_MUTED, font=("Consolas", 9))

        style.configure("App.TCombobox",
            fieldbackground=self.C_SURFACE, background=self.C_SURFACE,
            foreground=self.C_TEXT, selectbackground=self.C_BORDER,
            selectforeground=self.C_TEXT, arrowcolor=self.C_MUTED,
            bordercolor=self.C_BORDER, lightcolor=self.C_BORDER, darkcolor=self.C_BORDER)

        style.map("App.TCombobox",
            fieldbackground=[("readonly", self.C_SURFACE)],
            foreground=[("readonly", self.C_TEXT)])

        style.configure("App.Horizontal.TScale",
            background=self.C_BG, troughcolor=self.C_BORDER,
            sliderthickness=18, sliderrelief="flat")

        style.configure("App.TNotebook",
            background=self.C_BG, tabmargins=[0, 0, 0, 0], borderwidth=0)
        style.configure("App.TNotebook.Tab",
            background=self.C_BORDER, foreground=self.C_MUTED,
            font=("Segoe UI", 10), padding=[16, 6])
        style.map("App.TNotebook.Tab",
            background=[("selected", self.C_SURFACE)],
            foreground=[("selected", self.C_TEXT)])

    # ── UI Layout ────────────────────────────────────────────────────────────

    def _build_ui(self):
        # Header
        hdr = ttk.Frame(self, style="App.TFrame", padding=(20, 16, 20, 10))
        hdr.pack(fill="x")
        ttk.Label(hdr, text="Audio PWM Generator", style="Title.TLabel").pack(side="left")
        self._dot = tk.Label(hdr, text="●", fg=self.C_RED, bg=self.C_BG, font=("Segoe UI", 14))
        self._dot.pack(side="right", padx=(0, 2))
        ttk.Label(hdr, text="output", style="Muted.TLabel").pack(side="right", padx=(0, 6))

        # Separator
        tk.Frame(self, bg=self.C_BORDER, height=1).pack(fill="x")

        # Notebook
        nb = ttk.Notebook(self, style="App.TNotebook")
        nb.pack(fill="both", expand=True, padx=0, pady=0)

        ctrl_tab = ttk.Frame(nb, style="App.TFrame", padding=(24, 20))
        hw_tab   = ttk.Frame(nb, style="App.TFrame")
        nb.add(ctrl_tab, text="  PWM Control  ")
        nb.add(hw_tab,   text="  Hardware Guide  ")

        self._build_control_tab(ctrl_tab)
        self._build_hw_tab(hw_tab)

        # Status bar
        sb = ttk.Frame(self, style="Surface.TFrame", padding=(16, 6))
        sb.pack(fill="x", side="bottom")
        self._status_label = ttk.Label(sb, textvariable=self._status_var, style="Status.TLabel")
        self._status_label.pack(side="left")

    def _build_control_tab(self, parent):
        # Device row
        dev_row = ttk.Frame(parent, style="App.TFrame")
        dev_row.pack(fill="x", pady=(0, 20))
        ttk.Label(dev_row, text="Audio device", style="Muted.TLabel").pack(anchor="w")
        self._device_combo = ttk.Combobox(
            dev_row, textvariable=self._device_var,
            state="readonly", style="App.TCombobox", width=52)
        self._device_combo.pack(fill="x", pady=(4, 0))

        # Frequency
        self._build_slider_row(
            parent,
            label="Frequency",
            unit="Hz",
            var=self._freq_var,
            entry_var=self._freq_entry_var,
            from_=20, to=20000,
            log=True,
            on_change=self._on_freq_change,
            format_fn=lambda v: f"{v:.0f}",
        )

        # Duty Cycle
        self._build_slider_row(
            parent,
            label="Duty Cycle",
            unit="%",
            var=self._duty_var,
            entry_var=self._duty_entry_var,
            from_=0, to=100,
            log=False,
            on_change=self._on_duty_change,
            format_fn=lambda v: f"{v:.1f}",
        )

        # Waveform preview
        ttk.Label(parent, text="Waveform Preview", style="Muted.TLabel").pack(anchor="w", pady=(8, 4))
        self._wave_canvas = WaveformCanvas(parent, height=90)
        self._wave_canvas.pack(fill="x")
        self._wave_canvas.update_wave(self._freq_var.get(), self._duty_var.get())

        # Buttons
        btn_row = ttk.Frame(parent, style="App.TFrame")
        btn_row.pack(fill="x", pady=(24, 0))

        self._start_btn = tk.Button(
            btn_row, text="▶  START OUTPUT",
            bg=self.C_GREEN, fg="#0f172a", activebackground="#86efac",
            font=("Segoe UI", 11, "bold"), relief="flat", bd=0,
            padx=20, pady=10, cursor="hand2",
            command=self._toggle_output)
        self._start_btn.pack(side="left", padx=(0, 12))

        self._vol_btn = tk.Button(
            btn_row, text="Volume: 100%",
            bg=self.C_BORDER, fg=self.C_TEXT, activebackground=self.C_SURFACE,
            font=("Segoe UI", 9), relief="flat", bd=0,
            padx=12, pady=10, cursor="hand2",
            command=self._open_volume)
        self._vol_btn.pack(side="left")

        ttk.Label(btn_row,
            text="  ← Set Windows volume to 100% for best signal",
            style="Muted.TLabel").pack(side="left", padx=(8, 0))

    def _build_slider_row(self, parent, label, unit, var, entry_var, from_, to,
                          log, on_change, format_fn):
        row = ttk.Frame(parent, style="App.TFrame")
        row.pack(fill="x", pady=(0, 16))

        # Header
        hdr = ttk.Frame(row, style="App.TFrame")
        hdr.pack(fill="x")
        ttk.Label(hdr, text=label, style="App.TLabel").pack(side="left")

        # Entry + unit
        entry = tk.Entry(
            hdr, textvariable=entry_var, width=8,
            bg=self.C_SURFACE, fg=self.C_ACCENT,
            insertbackground=self.C_TEXT, relief="flat",
            font=("Consolas", 12, "bold"), justify="right",
            highlightthickness=1, highlightcolor=self.C_ACCENT,
            highlightbackground=self.C_BORDER)
        entry.pack(side="right")
        ttk.Label(hdr, text=f" {unit}", style="Value.TLabel").pack(side="right")

        # Slider
        if log:
            log_min = math.log10(from_)
            log_max = math.log10(to)

            def slider_to_val(s): return 10 ** s
            def val_to_slider(v): return math.log10(max(from_, v))

            scale_var = tk.DoubleVar(value=val_to_slider(var.get()))

            def _slider_changed(sval):
                v = slider_to_val(float(sval))
                var.set(v)
                entry_var.set(format_fn(v))
                on_change(v)

            def _entry_changed(*_):
                try:
                    v = float(entry_var.get())
                    v = max(from_, min(to, v))
                    var.set(v)
                    scale_var.set(val_to_slider(v))
                    on_change(v)
                except ValueError:
                    pass

            scale = ttk.Scale(
                row, from_=log_min, to=log_max,
                variable=scale_var, orient="horizontal",
                style="App.Horizontal.TScale",
                command=_slider_changed)
            scale.pack(fill="x", pady=(4, 0))
            entry.bind("<Return>",    _entry_changed)
            entry.bind("<FocusOut>",  _entry_changed)

            range_row = ttk.Frame(row, style="App.TFrame")
            range_row.pack(fill="x")
            ttk.Label(range_row, text=f"{from_} Hz",  style="Muted.TLabel").pack(side="left")
            ttk.Label(range_row, text=f"{to:,} Hz", style="Muted.TLabel").pack(side="right")
        else:
            def _slider_changed(sval):
                v = float(sval)
                var.set(v)
                entry_var.set(format_fn(v))
                on_change(v)

            def _entry_changed(*_):
                try:
                    v = float(entry_var.get())
                    v = max(from_, min(to, v))
                    var.set(v)
                    on_change(v)
                except ValueError:
                    pass

            scale = ttk.Scale(
                row, from_=from_, to=to,
                variable=var, orient="horizontal",
                style="App.Horizontal.TScale",
                command=_slider_changed)
            scale.pack(fill="x", pady=(4, 0))
            entry.bind("<Return>",   _entry_changed)
            entry.bind("<FocusOut>", _entry_changed)

            range_row = ttk.Frame(row, style="App.TFrame")
            range_row.pack(fill="x")
            ttk.Label(range_row, text=f"{from_}%",  style="Muted.TLabel").pack(side="left")
            ttk.Label(range_row, text=f"{to}%",     style="Muted.TLabel").pack(side="right")

    def _build_hw_tab(self, parent):
        txt = tk.Text(
            parent, wrap="none", bg=self.C_BG, fg="#94a3b8",
            insertbackground=self.C_TEXT, relief="flat", bd=0,
            font=("Consolas", 9), padx=20, pady=16,
            highlightthickness=0, state="normal",
            selectbackground=self.C_BORDER)

        # Headings in accent colour
        txt.tag_configure("heading", foreground=self.C_ACCENT, font=("Consolas", 9, "bold"))
        txt.tag_configure("warn",    foreground=self.C_ORANGE)
        txt.tag_configure("normal",  foreground="#94a3b8")

        lines = MOSFET_GUIDE.split("\n")
        for line in lines:
            if line.startswith("┌") or line.startswith("│  CIRCUIT") or line.startswith("│  AUDIO"):
                txt.insert("end", line + "\n", "heading")
            elif line.startswith("  ⚠"):
                txt.insert("end", line + "\n", "warn")
            else:
                txt.insert("end", line + "\n", "normal")

        txt.configure(state="disabled")

        sb_y = ttk.Scrollbar(parent, orient="vertical",   command=txt.yview)
        sb_x = ttk.Scrollbar(parent, orient="horizontal", command=txt.xview)
        txt.configure(yscrollcommand=sb_y.set, xscrollcommand=sb_x.set)

        sb_y.pack(side="right",  fill="y")
        sb_x.pack(side="bottom", fill="x")
        txt.pack(fill="both", expand=True)

    # ── Device population ────────────────────────────────────────────────────

    def _populate_devices(self):
        try:
            devs = sd.query_devices()
            out_devs = [(i, d) for i, d in enumerate(devs) if d["max_output_channels"] > 0]
            self._devices = out_devs
            names = [f"{d['name']}" for _, d in out_devs]
            self._device_combo["values"] = names
            # Select default
            default_idx = sd.default.device[1]
            for pos, (i, _) in enumerate(out_devs):
                if i == default_idx:
                    self._device_combo.current(pos)
                    break
            else:
                if names:
                    self._device_combo.current(0)
        except Exception:
            self._device_combo["values"] = ["Default"]
            self._device_combo.current(0)

    def _get_selected_device_index(self):
        sel = self._device_combo.current()
        if sel < 0 or sel >= len(self._devices):
            return None
        return self._devices[sel][0]

    # ── Control callbacks ─────────────────────────────────────────────────────

    def _on_freq_change(self, val):
        self.engine.frequency = val
        self._freq_entry_var.set(f"{val:.0f}")
        self._wave_canvas.update_wave(val, self._duty_var.get())
        self._update_status_bar()

    def _on_duty_change(self, val):
        self.engine.duty_cycle = val
        self._duty_entry_var.set(f"{val:.1f}")
        self._wave_canvas.update_wave(self._freq_var.get(), val)
        self._update_status_bar()

    def _toggle_output(self):
        if self.engine.running:
            self.engine.stop()
            self._start_btn.configure(
                text="▶  START OUTPUT", bg=self.C_GREEN, fg="#0f172a")
            self._dot.configure(fg=self.C_RED)
        else:
            try:
                dev = self._get_selected_device_index()
                self.engine.frequency  = self._freq_var.get()
                self.engine.duty_cycle = self._duty_var.get()
                self.engine.start(device_index=dev)
                self._start_btn.configure(
                    text="■  STOP OUTPUT", bg=self.C_RED, fg="#0f172a")
                self._dot.configure(fg=self.C_GREEN)
            except RuntimeError as exc:
                from tkinter import messagebox
                messagebox.showerror("Audio Error", str(exc))
        self._update_status_bar()

    def _open_volume(self):
        import subprocess
        subprocess.Popen(["sndvol.exe"], shell=True)

    def _update_status_bar(self):
        state = "ACTIVE" if self.engine.running else "Stopped"
        freq  = self._freq_var.get()
        duty  = self._duty_var.get()
        self._status_var.set(
            f"Status: {state}   |   Frequency: {freq:.0f} Hz   |   Duty Cycle: {duty:.1f}%   |   Sample Rate: {SAMPLE_RATE} Hz")

    def _on_close(self):
        self.engine.stop()
        self.destroy()


# ─────────────────────────────────────────────────────────────────────────────

def main():
    app = App()
    app.mainloop()

if __name__ == "__main__":
    main()
