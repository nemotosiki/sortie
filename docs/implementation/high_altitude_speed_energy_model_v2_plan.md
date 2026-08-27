# Shared speed-dependent high-altitude model v2

**Frozen before implementation:** 2026-08-27  
**Branch:** `codex/sera-m11-high-altitude-strike-rework`  
**Reference checkpoint:** `d0c8f0a`

## Decision

Use one altitude/energy model for every fixed-wing fighter. Do not branch on an
aircraft id and do not author one ceiling curve per aircraft. MiG-31's altitude
advantage must emerge from its existing 833 m/s maximum speed. F-4 keeps its
authored speed because it is excluded from the separate five-percent fighter
speed rebalance, but it receives no altitude exception.

HALO is the only exception: it is a mission-scripted electronic-support
formation rather than a simulated fighter and continues to hold 12,500 m.

## Inputs

The shared calculation may read only:

- current altitude;
- current true/world speed used by the HUD;
- effective maximum speed after the existing roster rebalance;
- authored stall-entry speed and the existing deep/recovery offsets;
- the existing turn, structural-G, stability and throttle-response values;
- ISA density ratio.

Remove `highAltitudeCeilingBonus`. No `mig31` check replaces it.

## Frozen common curves

Let `S(a, b, h)` be ordinary smoothstep from altitude `a` to `b`.

Maximum sustainable level-speed retention:

```text
R(h) = 1
     - (1 / 3)   * S(6500, 11000, h)
     - (1 / 150) * S(11000, 12000, h)
     - 0.08      * S(12000, 14000, h)
```

Common high-altitude control-energy floor in m/s:

```text
E(h) = 520 * S(6500, 11000, h)
     +  30 * S(10000, 12000, h)
```

For an aircraft with effective maximum speed `Vmax`:

```text
Vavailable(h) = Vmax * R(h)
VdensityStall(h) = Vstall / sqrt(effectiveDensityRatio(h))
Vminimum(h) = max(VdensityStall(h), E(h))
```

`Vminimum` becomes the shared stall-entry/control-energy threshold. Warning,
deep-stall and recovery thresholds preserve their existing offsets from the
airframe's authored stall entry, scaled by the density multiplier. They are not
all multiplied by one giant ratio.

Current-speed response:

```text
speedRatio = currentSpeed / Vminimum
controlAuthority = 0.15 + 0.85 * S(0.82, 1.12, speedRatio)
climbAuthority = S(1.00, 1.18, speedRatio)
```

The existing corner-speed and structural-G turn envelope still applies after
this control factor, so excessive speed increases turn radius instead of
granting unlimited manoeuvrability. A climb continues to spend kinetic energy
through the existing world-gravity energy exchange.

There is no forced ceiling sink, positional clamp, redirected vertical motion,
or aircraft-id exception. Above sustainable altitude, `Vavailable` falls below
`Vminimum`; the ordinary stall, nose-drop and world-gravity systems then make
the aircraft descend. A zoom climb can cross the sustainable altitude briefly.

## Calibration anchors

The model is calibrated around MiG-31, not around a shared fighter ceiling:

| Altitude | Shared retention | MiG-31 maximum | Energy floor |
|---:|---:|---:|---:|
| 9,000 m | 0.8057 | 2,416 km/h | 303 m/s |
| 10,000 m | 0.7087 | 2,125 km/h | 454 m/s |
| 11,000 m | 0.6667 | 1,999 km/h | 535 m/s |
| 12,000 m | 0.6600 | 1,979 km/h | 550 m/s |

At 11,000 m MiG-31 therefore meets the requested approximately 2,000 km/h
anchor with a narrow positive energy margin. Near 12,000 m its available speed
meets the shared floor and sustained climb ends.

## Full-roster static simulation

The sustainable altitude is the five-metre crossing where
`Vavailable >= Vminimum`. Values use the current effective boost speeds, so the
existing five-percent rebalance is included and F-4/MiG-31 remain unscaled.

| Aircraft | Sustainable altitude | Max at 10,000 m | Max at 11,000 m |
|---|---:|---:|---:|
| MiG-31 | 11,920 m | 2,125 km/h | 1,999 km/h |
| F-3 | 10,460 m | 1,891 km/h | 1,778 km/h |
| F-22 | 10,205 m | 1,757 km/h | 1,653 km/h |
| F-14 | 10,060 m | 1,672 km/h | 1,573 km/h |
| F-15C | 10,020 m | 1,648 km/h | 1,550 km/h |
| Su-57 | 10,020 m | 1,648 km/h | 1,550 km/h |
| Su-35 | 9,900 m | 1,576 km/h | 1,482 km/h |
| Su-37 | 9,880 m | 1,563 km/h | 1,471 km/h |
| F-15E | 9,865 m | 1,551 km/h | 1,459 km/h |
| Typhoon | 9,865 m | 1,551 km/h | 1,459 km/h |
| Su-33 | 9,825 m | 1,527 km/h | 1,436 km/h |
| MiG-23 | 9,790 m | 1,503 km/h | 1,414 km/h |
| Su-47 | 9,750 m | 1,479 km/h | 1,391 km/h |
| Rafale | 9,715 m | 1,454 km/h | 1,368 km/h |
| F-4 | 9,680 m | 1,429 km/h | 1,344 km/h |
| MiG-29A | 9,660 m | 1,418 km/h | 1,334 km/h |
| MiG-21 | 9,645 m | 1,406 km/h | 1,322 km/h |
| F-16 | 9,610 m | 1,382 km/h | 1,300 km/h |
| F/A-18F | 9,540 m | 1,333 km/h | 1,254 km/h |
| F-35C | 9,505 m | 1,309 km/h | 1,231 km/h |
| Gripen | 9,470 m | 1,285 km/h | 1,208 km/h |
| F-2A | 9,435 m | 1,260 km/h | 1,186 km/h |
| F/A-18A | 9,435 m | 1,260 km/h | 1,186 km/h |

Normal fighters therefore occupy a compact 9.4–10.5 km band rather than
sharing one hard 10 km value. MiG-31 remains the only fighter near 12 km without
an id-based bonus.

## Dynamic zoom simulation

A deterministic 180-second full-power climb from 8,500 m was also evaluated at
5, 8 and 10 degrees. The model used the current throttle-response constants,
world-gravity energy loss, the shared stall threshold and the 44 m/s stall sink
cap. Representative 8-degree transient apexes were:

| Aircraft | 8-degree zoom apex |
|---|---:|
| MiG-31 | 12,369 m |
| F-3 | 10,529 m |
| F-22 | 10,275 m |
| F-15C | 10,099 m |
| F-4 | 9,800 m |
| MiG-29A | 9,728 m |
| F-16 | 9,678 m |
| F/A-18F | 9,615 m |
| F-2A | 9,502 m |

These are transient zoom heights, not loiter altitudes. The aircraft loses
speed, enters the ordinary stall path and descends after the apex.

## Acceptance gates

- MiG-31 level HUD/world speed at 11,000 m: 1,980–2,020 km/h.
- MiG-31 sustainable altitude: 11,800–12,100 m.
- Every non-MiG-31 fighter sustainable altitude: 9,300–10,700 m.
- F-4 keeps its authored unscaled maximum speed and remains inside the ordinary
  altitude band.
- No `highAltitudeCeilingBonus`, `if (type === "mig31")`, hard Y clamp or forced
  ceiling sink exists in the fixed-wing flight path.
- Player and enemy aircraft use the same speed-dependent calculation.
- HUD speed equals measured world displacement speed.
- HALO remains at 12,500 m through mission scripting only.

