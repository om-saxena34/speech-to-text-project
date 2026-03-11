// ── State ──────────────────────────────────────────
let audioBlob = null;
let recorder = null;
let chunks = [];
let timerInterval = null;

// ── DOM refs ───────────────────────────────────────
const uploadBtn    = document.getElementById("uploadBtn");
const fileInput    = document.getElementById("fileInput");
const micBtn       = document.getElementById("micBtn");
const preview      = document.getElementById("audioPreview");
const waveform     = document.getElementById("waveform");
const timerBadge   = document.getElementById("timerBadge");
const timerText    = document.getElementById("timerText");
const loader       = document.getElementById("loader");
const resultCard   = document.getElementById("resultCard");
const output       = document.getElementById("output");
const copyBtn      = document.getElementById("copyBtn");
const statusMsg    = document.getElementById("statusMsg");

// ── Upload file ────────────────────────────────────
uploadBtn.onclick = () => fileInput.click();

fileInput.onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  audioBlob = file;
  waveform.classList.add("visible");
  setStatus(`Loaded: ${file.name}`);
};

// ── Mic recording ──────────────────────────────────
let micStream = null;

micBtn.onclick = async () => {
  // If already recording → stop
  if (recorder && recorder.state === "recording") {
    recorder.stop();
    micStream.getTracks().forEach(t => t.stop());
    return;
  }

  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(micStream);
    chunks = [];

    recorder.ondataavailable = (e) => chunks.push(e.data);

    recorder.onstop = () => {
      clearInterval(timerInterval);
      timerBadge.classList.remove("visible");
      micBtn.classList.remove("recording");
      micBtn.innerHTML = "🎤";

      audioBlob = new Blob(chunks, { type: "audio/wav" });
      // No audio preview shown — just update waveform & status
      waveform.classList.add("visible");
      setStatus("Recording ready");
    };

    recorder.start();
    micBtn.classList.add("recording");
    micBtn.innerHTML = "⏹";
    timerBadge.classList.add("visible");
    waveform.classList.add("visible");

    // Count-up timer (no limit)
    let elapsed = 0;
    timerText.textContent = `Recording… 0s`;
    timerInterval = setInterval(() => {
      elapsed++;
      timerText.textContent = `Recording… ${elapsed}s`;
    }, 1000);

  } catch (err) {
    alert("Microphone access denied. Please allow microphone permissions.");
  }
};

// ── Transcribe ─────────────────────────────────────
document.getElementById("transcribeBtn").onclick = async () => {
  if (!audioBlob) {
    shakeBtn();
    alert("Please upload or record audio first.");
    return;
  }

  // Show loader
  loader.classList.add("visible");
  loader.style.display = "block";
  resultCard.classList.remove("visible");
  setStatus("Transcribing…");

  const formData = new FormData();
  formData.append("audio", audioBlob, "audio.wav");

  try {
    const response = await fetch("/transcribe", {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    loader.style.display = "none";
    loader.classList.remove("visible");

    // Reveal result with typewriter effect
    resultCard.classList.add("visible");
    typeWriter(data.text || "(No speech detected)");
    setStatus("Done ✓");

  } catch (err) {
    loader.style.display = "none";
    loader.classList.remove("visible");
    alert("Transcription failed. Is the server running?");
    setStatus("Error");
  }
};

// ── Copy to clipboard ─────────────────────────────
copyBtn.onclick = () => {
  const text = output.innerText;
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copyBtn.textContent = "✓ Copied!";
    setTimeout(() => (copyBtn.textContent = "⎘ Copy"), 2000);
  });
};

// ── Helpers ───────────────────────────────────────
function setStatus(msg) {
  statusMsg.textContent = msg;
}

function typeWriter(text) {
  output.textContent = "";
  let i = 0;
  const speed = Math.max(18, Math.min(40, 3000 / text.length));
  const tick = () => {
    if (i < text.length) {
      output.textContent += text.charAt(i++);
      setTimeout(tick, speed);
    }
  };
  tick();
}

function shakeBtn() {
  const btn = document.getElementById("transcribeBtn");
  btn.style.animation = "shake 0.4s ease";
  btn.addEventListener("animationend", () => (btn.style.animation = ""), { once: true });
}

// inject shake keyframe dynamically
const shakeStyle = document.createElement("style");
shakeStyle.textContent = `
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%      { transform: translateX(-6px); }
    40%      { transform: translateX(6px); }
    60%      { transform: translateX(-4px); }
    80%      { transform: translateX(4px); }
  }
`;
document.head.appendChild(shakeStyle);
