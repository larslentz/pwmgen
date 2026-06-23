# Audio PWM Generator

Generates a real PWM square wave through your laptop's headphone/audio jack.
No external hardware needed for the software — just Python on Windows.

## Quick Start (Windows)

**Option A — Double-click to run:**
1. Download/copy this `pwm_generator` folder to your Windows laptop
2. Double-click `setup_and_run.bat`
3. It installs dependencies and launches the app automatically

**Option B — Manual:**
```
pip install sounddevice numpy
python main.py
```

## Requirements

- Python 3.9+ ([python.org](https://python.org/downloads)) — check "Add Python to PATH"
- Windows 10 / 11
- Working audio output (headphone jack or USB audio adapter)

## Package as a Standalone EXE

To share the app without needing Python installed on the target machine:

```
build_exe.bat
```

The resulting `dist\AudioPWMGenerator.exe` runs with no dependencies.

---

## Connecting to 12V Hardware

The headphone jack outputs ~1 Vpp AC. Use one of these circuits to
switch 12V loads. See the **Hardware Guide** tab inside the app for
full diagrams and notes.

### IRLZ44N MOSFET (recommended)
```
12V+ ──── Load ──── Drain
                     │  IRLZ44N
Headphone ──10kΩ─── Gate
Headphone GND ────── Source ──── 12V GND
```
Add a 10 kΩ pull-down between Gate and Source.

### NPN BJT — 2N2222 / BC547 (alternative)
```
12V+ ──── Load ──── Collector
                     │  2N2222
Headphone ──1kΩ──── Base
Headphone GND ────── Emitter ──── 12V GND
```

### Important tips
- Set Windows volume to **100%** for maximum gate drive
- Best working range: **5% – 95%** duty cycle (AC coupling in headphone amp
  causes drift near 0% and 100%)
- Always connect headphone GND (sleeve) to circuit GND
- Use a flyback diode across inductive loads (motors, solenoids)

---

## Controls

| Control | Range | Notes |
|---|---|---|
| Frequency | 20 Hz – 20,000 Hz | Logarithmic slider; type exact value in box |
| Duty Cycle | 0% – 100% | Linear slider; type exact value in box |
| Device | dropdown | Choose headphone jack vs. built-in speakers |

## Files

```
pwm_generator/
├── main.py            ← the full application (single file)
├── requirements.txt   ← pip dependencies
├── setup_and_run.bat  ← one-click install + launch (Windows)
└── build_exe.bat      ← package to standalone .exe with PyInstaller
```
