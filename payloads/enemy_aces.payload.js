// Enemy-aces batch: CROSSWIND, a four-ship named MiG-29 escort flight.
//
// The squadron is inserted beside m-intercept's existing AWACS contact. All four
// are bonus contacts (tgt:false), so the authored objective count, par time,
// briefing and wave composition stay intact. Their shared paint and airframe make
// them read as one unit; distinct evasion envelopes and radio roles make them fly
// as lead / flank / vertical cut / rear guard rather than four copies.
//
// This payload adds only four ACE_PROFILES entries and four mission contacts. It
// does not touch index.html, AIRCRAFT_TYPES, HP, difficulty scaling or any mission
// other than m-intercept.
export default function register(ctx) {
  const { ACE_PROFILES, MISSIONS } = ctx.tables;
  const template = ACE_PROFILES.fenrir || ACE_PROFILES.ironback;
  if (!template || !template.theme || !template.radio) {
    throw new Error("[enemy-aces] expected an existing complete ace profile template");
  }

  function crosswindAce(overrides) {
    return {
      ...template,
      ...overrides,
      // One paint scheme across all four aircraft: charcoal, one old-gold stripe,
      // and warm NFF exhaust. The role is read from how each pilot moves, not from
      // four unrelated liveries.
      theme: {
        ...template.theme,
        primary: 0x3b4248,
        secondary: 0x1d2227,
        accent: 0xc8a84d,
        canopy: 0xbfe7ff,
        exhaust: 0xffc79a,
        scale: 0.98,
        ...(overrides.theme || {})
      },
      radio: {
        ...template.radio,
        ...(overrides.radio || {})
      }
    };
  }

  // BOREAS is the pressure aircraft. Low-amplitude, low-frequency evasion keeps
  // it close to the nose-on fight instead of wandering out to a flank.
  ctx.addAceProfile("crosswindBoreas", crosswindAce({
    callsign: "BOREAS",
    role: "Crosswind Lead / Frontal Pressure",
    behavior: "evasive",
    evadeLateral: 44,
    evadeVertical: 18,
    evadeFrequency: 1.4,
    radarColor: "#d7edf7",
    tracerColor: 0xd7edf7,
    radio: {
      inbound: "敵AWACS直衛にネームド4——CROSSWIND。先頭はBOREAS。",
      wingman: "隊長機が正面を押さえて、残り3機が包む形だ。真ん中に居座るな。",
      engage: "こちらBOREAS。CROSSWIND、楔形。私が正面を固定する。",
      down: "BOREAS被弾。EURUS、先頭を引き継げ。隊形を切るな。"
    }
  }));

  // EURUS is the horizontal bracket. Lateral amplitude and frequency are the
  // highest in the flight, while vertical movement stays deliberately small.
  ctx.addAceProfile("crosswindEurus", crosswindAce({
    callsign: "EURUS",
    role: "Crosswind Right Flanker",
    behavior: "evasive",
    evadeLateral: 96,
    evadeVertical: 20,
    evadeFrequency: 2.6,
    radarColor: "#ffca78",
    tracerColor: 0xffca78,
    radio: {
      inbound: "CROSSWIND右翼、EURUS。大きく外へ回っている。",
      wingman: "右の反応が消えた……いや、レーダーの外縁へ回っただけだ。",
      engage: "EURUS、右翼へ。BOREAS、そのまま正面を押して。",
      down: "EURUS離脱。NOTUS、右側の空席を埋めろ。"
    }
  }));

  // NOTUS is the vertical cutter. It gives up some lateral travel for the
  // largest vertical envelope, attacking from above and below the lead's merge.
  ctx.addAceProfile("crosswindNotus", crosswindAce({
    callsign: "NOTUS",
    role: "Crosswind High Cutter",
    behavior: "evasive",
    evadeLateral: 58,
    evadeVertical: 52,
    evadeFrequency: 2.3,
    radarColor: "#ff916c",
    tracerColor: 0xff916c,
    radio: {
      inbound: "CROSSWIND上空、NOTUS。高度差を作ってくる。",
      wingman: "上を取られた！ BOREASだけ見てると頭上から切られるぞ。",
      engage: "NOTUS、高度差を取る。上から逃げ道を閉じる。",
      down: "NOTUS被弾。ZEPHYR、下がるな。編隊を戻せ。"
    }
  }));

  // ZEPHYR is the stabiliser. Moderate motion at the lowest frequency lets it
  // stay behind the other three and re-form the group when the lead changes.
  ctx.addAceProfile("crosswindZephyr", crosswindAce({
    callsign: "ZEPHYR",
    role: "Crosswind Rear Guard",
    behavior: "evasive",
    evadeLateral: 70,
    evadeVertical: 26,
    evadeFrequency: 1.2,
    radarColor: "#8fd8c4",
    tracerColor: 0x8fd8c4,
    radio: {
      inbound: "CROSSWIND後衛、ZEPHYR。編隊の背中を守っている。",
      wingman: "最後尾が一番崩れない。あいつが残る限り、3機はまた隊形に戻るぞ。",
      engage: "ZEPHYR、後衛。全機の背中は見る——隊形を切るな。",
      down: "ZEPHYR離脱。CROSSWIND、編隊解散……名前だけは残せ。"
    }
  }));

  // Re-register through addMission so totals, contacts and frozen wave metadata
  // are rebuilt by the same normalizer as every authored mission.
  function extendMission(key, makeReplacement) {
    const at = MISSIONS.findIndex((mission) => mission.key === key);
    if (at <= 0) {
      throw new Error(`[enemy-aces] mission ${key} not found at a replaceable index`);
    }
    const original = MISSIONS[at];
    const after = MISSIONS[at - 1].key;
    const replacement = makeReplacement(original);

    MISSIONS.splice(at, 1);
    try {
      return ctx.addMission(replacement, { after });
    } catch (error) {
      MISSIONS.splice(at, 0, original);
      throw error;
    }
  }

  extendMission("m-intercept", (mission) => {
    const sequence = [...mission.sequence];
    const awacsAt = sequence.findIndex((wave) =>
      wave && wave.tgt !== false && Array.isArray(wave.types) && wave.types.includes("awacs"));
    if (awacsAt < 0) {
      throw new Error("[enemy-aces] m-intercept has no designated AWACS wave");
    }

    // Four one-aircraft concurrent entries are the existing engine's squadron
    // idiom: one ACE_PROFILES identity per wave, all attached to the same AWACS
    // engagement. They are non-TGT escorts, so BOMBER STREAM remains a bomber /
    // command-aircraft interception rather than becoming a compulsory ace hunt.
    const crosswindWaves = [
      {
        types: ["mig29"], ace: "crosswindBoreas", tgt: false,
        concurrent: true, band: 1, label: "CROSSWIND LEAD",
        radio: [
          { speaker: "command", text: "敵AWACS直衛にネームド4——CROSSWIND。全機MiG-29、編隊を崩してから大型機へ行け。", id: "crosswind-boreas-inbound" }
        ]
      },
      {
        types: ["mig29"], ace: "crosswindEurus", tgt: false,
        concurrent: true, band: 2, label: "CROSSWIND RIGHT",
        radio: [
          { speaker: "enemy", text: "EURUS、右翼へ。外から挟む。", id: "crosswind-eurus-role" }
        ]
      },
      {
        types: ["mig29"], ace: "crosswindNotus", tgt: false,
        concurrent: true, band: 1, label: "CROSSWIND HIGH",
        radio: [
          { speaker: "wingman", text: "上にも1機！ NOTUSが高度差を取ってる——正面だけ見るな！", id: "crosswind-notus-role" }
        ]
      },
      {
        types: ["mig29"], ace: "crosswindZephyr", tgt: false,
        concurrent: true, band: 2, label: "CROSSWIND REAR",
        radio: [
          { speaker: "command", text: "最後尾ZEPHYRは後衛。AWACSへ向かう機を編隊へ戻している。", id: "crosswind-zephyr-role" }
        ]
      }
    ];

    sequence.splice(awacsAt + 1, 0, ...crosswindWaves);
    return { ...mission, sequence };
  });
}
