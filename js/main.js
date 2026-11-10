/* =========================================================
   The Psychology Behind Movies — interactions
   ========================================================= */

/* ---------- Navigation ---------- */
const nav = document.querySelector(".nav");
const navToggle = document.querySelector(".nav__toggle");
const navLinks = document.querySelector(".nav__links");

window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
}, { passive: true });

navToggle.addEventListener("click", () => {
  const open = navLinks.classList.toggle("is-open");
  nav.classList.toggle("menu-open", open);
  navToggle.setAttribute("aria-expanded", open);
  navToggle.textContent = open ? "✕" : "☰";
});
navLinks.querySelectorAll("a").forEach(link =>
  link.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    nav.classList.remove("menu-open");
    navToggle.setAttribute("aria-expanded", false);
    navToggle.textContent = "☰";
  })
);

// Highlight the menu link for the section on screen
const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    navLinks.querySelectorAll("a").forEach(a =>
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + entry.target.id)
    );
  });
}, { rootMargin: "-45% 0px -50% 0px" });
document.querySelectorAll("main section[id]").forEach(s => sectionObserver.observe(s));

/* ---------- Scroll reveal ---------- */
const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll(".reveal").forEach((el, i) => {
  el.style.transitionDelay = (i % 4) * 80 + "ms";
  revealObserver.observe(el);
});

/* ---------- Film strip: duplicate frames for a seamless loop ---------- */
const strip = document.querySelector(".filmstrip");
strip.innerHTML += strip.innerHTML + strip.innerHTML;

/* =========================================================
   Audio helpers (Web Audio API — no sound files needed)
   ========================================================= */
let audioCtx = null;
function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}
const midiToFreq = m => 440 * Math.pow(2, (m - 69) / 12);

function playTone(ctx, dest, { freq, start, dur, type = "sine", vol = 0.2, attack = 0.02, release = 0.3 }) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(vol, start + attack);
  gain.gain.setValueAtTime(vol, start + Math.max(attack, dur - release));
  gain.gain.exponentialRampToValueAtTime(0.0001, start + dur + release);
  osc.connect(gain).connect(dest);
  osc.start(start);
  osc.stop(start + dur + release + 0.05);
}

/* =========================================================
   1. Empathy meter
   ========================================================= */
const empathyBoxes = document.querySelectorAll(".empathy__options input");
const empathyFill = document.getElementById("empathyFill");
const empathyValue = document.getElementById("empathyValue");
const empathyTip = document.getElementById("empathyTip");

empathyBoxes.forEach(box => box.addEventListener("change", () => {
  const total = [...empathyBoxes].filter(b => b.checked).reduce((sum, b) => sum + Number(b.value), 0);
  empathyFill.style.width = total + "%";
  empathyFill.style.backgroundPosition = (100 - total) + "% 0";
  animateNumber(empathyValue, total);

  if (box.checked) empathyTip.textContent = "💡 " + box.dataset.tip;
  if (total === 100) empathyTip.textContent = "🎉 Perfect! The audience would cry for this character.";
  if (total === 0) empathyTip.textContent = "Tick a box to begin…";
}));

function animateNumber(el, target) {
  const from = Number(el.textContent);
  const startTime = performance.now();
  const step = now => {
    const p = Math.min((now - startTime) / 500, 1);
    el.textContent = Math.round(from + (target - from) * p);
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* =========================================================
   2. The dark hallway (suspense + heartbeat)
   ========================================================= */
const hallway = document.getElementById("hallway");
const door = document.getElementById("door");
const reveal = document.getElementById("reveal");
const bpmEl = document.getElementById("bpm");
const heartIcon = document.getElementById("heartIcon");
const hallMsg = document.getElementById("hallMsg");
const stepBtn = document.getElementById("stepBtn");
const resetHall = document.getElementById("resetHall");
const scene = hallway.querySelector(".hallway__scene");

const hallSteps = [
  { bpm: 72,  msg: "You hear a noise behind the door…" },
  { bpm: 86,  msg: "You take a step. The floorboard creaks." },
  { bpm: 100, msg: "Silence. Too much silence. Your palms are sweating." },
  { bpm: 116, msg: "A shadow moves under the door. Your amygdala is on full alert!" },
  { bpm: 132, msg: "You reach for the handle. Adrenaline floods your body…" },
  { bpm: 150, msg: "One more step. Do you dare open it?" },
];
let hallIndex = 0;
let heartTimer = null;
let currentBpm = 72;

function heartbeatSound(volume) {
  const ctx = getAudio();
  const t = ctx.currentTime;
  [0, 0.18].forEach((offset, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(i ? 55 : 65, t + offset);
    osc.frequency.exponentialRampToValueAtTime(35, t + offset + 0.15);
    gain.gain.setValueAtTime(0, t + offset);
    gain.gain.linearRampToValueAtTime(volume * (i ? 0.7 : 1), t + offset + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.25);
  });
}

function setHeartRate(bpm, withSound = true) {
  currentBpm = bpm;
  bpmEl.textContent = bpm;
  const interval = 60000 / bpm;
  heartIcon.style.animationDuration = interval + "ms";
  clearInterval(heartTimer);
  if (withSound) {
    const vol = 0.35 + (bpm - 72) / 150;
    heartbeatSound(vol);
    heartTimer = setInterval(() => heartbeatSound(vol), interval);
  }
  // darken the scene as tension rises
  const tension = Math.max(0, (bpm - 72) / 80);
  scene.style.filter = `brightness(${1 - tension * 0.45}) saturate(${1 + tension})`;
}

function jumpScareSound() {
  const ctx = getAudio();
  const t = ctx.currentTime;
  // noise burst
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const nGain = ctx.createGain();
  nGain.gain.value = 0.25;
  noise.connect(nGain).connect(ctx.destination);
  noise.start(t);
  // dissonant stab
  [740, 784, 1046].forEach(f => playTone(ctx, ctx.destination, { freq: f, start: t, dur: 0.3, type: "sawtooth", vol: 0.06, attack: 0.005, release: 0.4 }));
}

stepBtn.addEventListener("click", () => {
  getAudio();
  if (hallIndex < hallSteps.length - 1) {
    hallIndex++;
    const s = hallSteps[hallIndex];
    hallMsg.textContent = s.msg;
    setHeartRate(s.bpm);
    if (hallIndex === hallSteps.length - 1) stepBtn.textContent = "Open the door 🚪";
  } else {
    // the big reveal
    stepBtn.disabled = true;
    clearInterval(heartTimer);
    jumpScareSound();
    hallway.classList.add("shake");
    door.classList.add("is-open");
    setTimeout(() => reveal.classList.add("is-visible"), 250);
    hallMsg.textContent = "😱 MEOW! …Phew. Feel that rush of relief? That's excitation transfer — leftover fear turning into relief and even laughter.";
    bpmEl.textContent = 165;
    // heart rate slowly comes back down
    let bpm = 165;
    const calm = setInterval(() => {
      bpm -= 9;
      if (bpm <= 80) { bpm = 80; clearInterval(calm); }
      bpmEl.textContent = bpm;
      heartIcon.style.animationDuration = 60000 / bpm + "ms";
      scene.style.filter = `brightness(${0.6 + (165 - bpm) / 200})`;
    }, 350);
  }
});

resetHall.addEventListener("click", () => {
  hallIndex = 0;
  clearInterval(heartTimer);
  stepBtn.disabled = false;
  stepBtn.textContent = "Take a step 👣";
  hallway.classList.remove("shake");
  door.classList.remove("is-open");
  reveal.classList.remove("is-visible");
  hallMsg.textContent = hallSteps[0].msg;
  setHeartRate(72, false);
  scene.style.filter = "";
});

/* =========================================================
   3. One scene, three soundtracks
   ========================================================= */
const sceneBox = document.getElementById("sceneBox");
const sceneMood = document.getElementById("sceneMood");
const soundButtons = document.querySelectorAll(".sound-btn");

const moodText = {
  happy: "Feels like: a joyful moment — she has just spotted an old friend running towards her! ☀️",
  sad: "Feels like: a goodbye — she is remembering someone she has lost. 🌧️",
  scary: "Feels like: danger — something is rising out of the water behind her… 🕷️",
};

let music = null; // { gain, timers[] }

function stopMusic() {
  if (!music) return;
  const ctx = getAudio();
  music.timers.forEach(clearTimeout);
  music.timers.forEach(clearInterval);
  music.gain.gain.cancelScheduledValues(ctx.currentTime);
  music.gain.gain.setValueAtTime(music.gain.gain.value, ctx.currentTime);
  music.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
  const old = music;
  setTimeout(() => { old.nodes.forEach(n => { try { n.stop(); } catch (e) {} }); old.gain.disconnect(); }, 500);
  music = null;
}

function startMusic(mood) {
  stopMusic();
  const ctx = getAudio();
  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);
  music = { gain: master, timers: [], nodes: [] };

  if (mood === "happy") {
    // C – F – G – C, bright arpeggios, fast tempo
    const chords = [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]];
    const beat = 0.18;
    const loopLen = chords.length * 4 * beat;
    const schedule = () => {
      const t0 = ctx.currentTime + 0.05;
      chords.forEach((c, ci) => {
        const pattern = [c[0], c[1], c[2], c[0] + 12];
        pattern.forEach((n, ni) => playTone(ctx, master, { freq: midiToFreq(n + 12), start: t0 + (ci * 4 + ni) * beat, dur: beat * 0.8, type: "triangle", vol: 0.12, release: 0.1 }));
        playTone(ctx, master, { freq: midiToFreq(c[0] - 12), start: t0 + ci * 4 * beat, dur: beat * 3.5, type: "triangle", vol: 0.1 });
      });
    };
    schedule();
    music.timers.push(setInterval(schedule, loopLen * 1000));
  }

  if (mood === "sad") {
    // A minor – F – D minor – E, slow and soft
    const chords = [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]];
    const beat = 0.6;
    const loopLen = chords.length * 4 * beat;
    const schedule = () => {
      const t0 = ctx.currentTime + 0.05;
      chords.forEach((c, ci) => {
        const pattern = [c[0], c[1], c[2], c[1]];
        pattern.forEach((n, ni) => playTone(ctx, master, { freq: midiToFreq(n + 12), start: t0 + (ci * 4 + ni) * beat, dur: beat * 1.4, type: "sine", vol: 0.13, attack: 0.08, release: 0.8 }));
        playTone(ctx, master, { freq: midiToFreq(c[0] - 12), start: t0 + ci * 4 * beat, dur: beat * 4, type: "sine", vol: 0.12, attack: 0.3, release: 0.6 });
      });
    };
    schedule();
    music.timers.push(setInterval(schedule, loopLen * 1000));
  }

  if (mood === "scary") {
    // Low dissonant drone (a "tritone") + sudden screeching strings
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0;
    droneGain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + 2);
    filter.connect(droneGain).connect(master);
    [55, 55 * Math.SQRT2, 56.5].forEach(f => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = f;
      o.connect(filter);
      o.start();
      music.nodes.push(o);
    });
    // slow "breathing" wobble on the drone
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.25;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    music.nodes.push(lfo);

    const stab = () => {
      const t = ctx.currentTime + 0.05;
      [1046.5, 1108.7].forEach(f => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        const vib = ctx.createOscillator();
        const vibGain = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = f;
        vib.frequency.value = 9;
        vibGain.gain.value = 25;
        vib.connect(vibGain).connect(o.frequency);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.035, t + 0.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g).connect(master);
        o.start(t); vib.start(t);
        o.stop(t + 1.7); vib.stop(t + 1.7);
      });
    };
    music.timers.push(setTimeout(stab, 2500));
    music.timers.push(setInterval(stab, 5000));
  }
}

soundButtons.forEach(btn => btn.addEventListener("click", () => {
  const mood = btn.dataset.mood;
  soundButtons.forEach(b => b.classList.remove("is-playing"));
  sceneBox.classList.remove("mood-happy", "mood-sad", "mood-scary");

  if (mood === "stop") {
    stopMusic();
    sceneMood.textContent = "Choose a soundtrack below…";
    return;
  }
  btn.classList.add("is-playing");
  sceneBox.classList.add("mood-" + mood);
  sceneMood.textContent = moodText[mood];
  startMusic(mood);
}));

// Stop the music if the visitor scrolls far away from the music section
new IntersectionObserver(entries => {
  if (!entries[0].isIntersecting && music) {
    stopMusic();
    soundButtons.forEach(b => b.classList.remove("is-playing"));
  }
}).observe(document.getElementById("music"));

/* =========================================================
   4. Kuleshov effect
   ========================================================= */
const kFrame = document.getElementById("kFrame");
const kImage = document.getElementById("kImage");
const kResult = document.getElementById("kResult");
document.querySelectorAll(".kuleshov__choices .chip").forEach(chip =>
  chip.addEventListener("click", () => {
    document.querySelectorAll(".kuleshov__choices .chip").forEach(c => c.classList.remove("is-active"));
    chip.classList.add("is-active");
    kImage.textContent = chip.dataset.img;
    kFrame.classList.remove("pop");
    void kFrame.offsetWidth; // restart animation
    kFrame.classList.add("pop");
    kResult.innerHTML = `Now the same face seems <strong>${chip.dataset.feel}</strong>. Your brain fills in the emotion from the context!`;
  })
);

/* =========================================================
   Quiz
   ========================================================= */
const quizData = [
  {
    q: "Which part of the brain “sounds the alarm” when we see something scary in a film?",
    options: ["The cerebellum", "The amygdala", "The spinal cord", "The hippocampus"],
    answer: 1,
    why: "The amygdala detects threats and triggers the fight-or-flight response.",
  },
  {
    q: "According to Hitchcock's “bomb theory”, suspense is created when…",
    options: ["A sudden loud noise plays", "The audience knows more than the characters", "The film is shot in black and white", "The characters scream"],
    answer: 1,
    why: "Showing the audience the bomb under the table turns an ordinary scene into nail-biting suspense.",
  },
  {
    q: "Film music in a minor key usually makes audiences feel…",
    options: ["Sad or serious", "Excited and energetic", "Hungry", "Nothing at all"],
    answer: 0,
    why: "Minor keys are commonly linked with sadness, while major keys feel brighter and happier.",
  },
  {
    q: "Brain cells that fire both when we act and when we watch someone else act are called…",
    options: ["Memory cells", "Motor nerves", "Mirror neurons", "Taste buds"],
    answer: 2,
    why: "Mirror neurons are thought to help us “feel with” the characters we watch.",
  },
  {
    q: "What does the Kuleshov effect show?",
    options: ["Colour films are scarier", "Loud music makes scenes shorter", "Actors must always show emotion clearly", "The meaning of a shot depends on the shots around it"],
    answer: 3,
    why: "The same neutral face seemed hungry, sad or loving depending on the image shown before it.",
  },
  {
    q: "Getting so “lost” in a story that it can change your beliefs is called…",
    options: ["Narrative transportation", "Excitation transfer", "Catharsis", "The startle reflex"],
    answer: 0,
    why: "Green & Brock (2000) showed that transported audiences are more easily persuaded by a story's ideas.",
  },
];

const quizBox = document.getElementById("quizBox");
let qIndex = 0;
let score = 0;

function renderQuestion() {
  const item = quizData[qIndex];
  quizBox.innerHTML = `
    <div class="quiz__progress"><div class="quiz__bar" style="width:${(qIndex / quizData.length) * 100}%"></div></div>
    <p class="quiz__count">Question ${qIndex + 1} of ${quizData.length}</p>
    <h3 class="quiz__question">${item.q}</h3>
    <div class="quiz__options">
      ${item.options.map((o, i) => `<button class="quiz__option" data-i="${i}">${o}</button>`).join("")}
    </div>
    <p class="quiz__feedback"></p>
    <button class="btn btn--primary quiz__next" hidden>${qIndex === quizData.length - 1 ? "See my score 🏆" : "Next ➜"}</button>
  `;
  const feedback = quizBox.querySelector(".quiz__feedback");
  const next = quizBox.querySelector(".quiz__next");
  const buttons = quizBox.querySelectorAll(".quiz__option");

  buttons.forEach(btn => btn.addEventListener("click", () => {
    const chosen = Number(btn.dataset.i);
    buttons.forEach(b => (b.disabled = true));
    buttons[item.answer].classList.add("is-correct");
    if (chosen === item.answer) {
      score++;
      feedback.innerHTML = "✅ <strong>Correct!</strong> " + item.why;
    } else {
      btn.classList.add("is-wrong");
      feedback.innerHTML = "❌ <strong>Not quite.</strong> " + item.why;
    }
    next.hidden = false;
    next.focus();
  }));

  next.addEventListener("click", () => {
    qIndex++;
    qIndex < quizData.length ? renderQuestion() : renderScore();
  });
}

function renderScore() {
  const pct = score / quizData.length;
  const msg = pct === 1 ? "🏆 Oscar-worthy! You're a film psychology expert."
    : pct >= 0.66 ? "🎬 Great job! You clearly paid attention to the plot."
    : pct >= 0.33 ? "🍿 Not bad! Maybe re-watch a few scenes above."
    : "📽️ Time for a re-run! Scroll up and try again.";
  quizBox.innerHTML = `
    <div class="quiz__progress"><div class="quiz__bar" style="width:100%"></div></div>
    <div class="quiz__score">
      <p class="quiz__count">Your score</p>
      <span class="big">${score} / ${quizData.length}</span>
      <p style="color:var(--text);font-size:1.15rem;margin-top:12px">${msg}</p>
      <button class="btn btn--primary" id="quizRestart">Play again ↺</button>
    </div>
  `;
  document.getElementById("quizRestart").addEventListener("click", () => {
    qIndex = 0;
    score = 0;
    renderQuestion();
  });
}

renderQuestion();
