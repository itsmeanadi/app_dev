/**
 * generate-beep.js
 * 
 * Generates a short sine-wave beep WAV file for the JerkGuard alert sound.
 * Run: node scripts/generate-beep.js
 * Output: assets/beep.wav
 * 
 * The beep is 0.3 seconds at 880 Hz (A5 note), 16-bit PCM, 44100 Hz sample rate, mono.
 * This is loud and attention-grabbing — suitable for an emergency alert.
 */

const fs = require('fs');
const path = require('path');

// --- Audio parameters ---
const SAMPLE_RATE = 44100;    // CD-quality sample rate
const DURATION = 0.3;         // seconds — short, sharp beep
const FREQUENCY = 880;        // Hz — A5, piercing and hard to ignore
const AMPLITUDE = 0.9;        // 0 to 1, near max volume
const NUM_CHANNELS = 1;       // Mono
const BITS_PER_SAMPLE = 16;   // 16-bit PCM

// --- Derived values ---
const numSamples = Math.floor(SAMPLE_RATE * DURATION);
const byteRate = SAMPLE_RATE * NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const blockAlign = NUM_CHANNELS * (BITS_PER_SAMPLE / 8);
const dataSize = numSamples * blockAlign;
const maxAmplitude = Math.pow(2, BITS_PER_SAMPLE - 1) - 1;

// --- Build WAV buffer ---
// WAV file = 44-byte header + raw PCM data
const buffer = Buffer.alloc(44 + dataSize);

// RIFF header
buffer.write('RIFF', 0);                          // ChunkID
buffer.writeUInt32LE(36 + dataSize, 4);            // ChunkSize
buffer.write('WAVE', 8);                           // Format

// fmt sub-chunk
buffer.write('fmt ', 12);                          // Subchunk1ID
buffer.writeUInt32LE(16, 16);                      // Subchunk1Size (16 for PCM)
buffer.writeUInt16LE(1, 20);                       // AudioFormat (1 = PCM)
buffer.writeUInt16LE(NUM_CHANNELS, 22);            // NumChannels
buffer.writeUInt32LE(SAMPLE_RATE, 24);             // SampleRate
buffer.writeUInt32LE(byteRate, 28);                // ByteRate
buffer.writeUInt16LE(blockAlign, 32);              // BlockAlign
buffer.writeUInt16LE(BITS_PER_SAMPLE, 34);         // BitsPerSample

// data sub-chunk
buffer.write('data', 36);                          // Subchunk2ID
buffer.writeUInt32LE(dataSize, 40);                // Subchunk2Size

// --- Generate sine wave samples ---
for (let i = 0; i < numSamples; i++) {
  const t = i / SAMPLE_RATE;
  // Apply a quick fade-in/fade-out envelope to avoid clicks
  const fadeLen = Math.floor(SAMPLE_RATE * 0.01); // 10ms fade
  let envelope = 1.0;
  if (i < fadeLen) {
    envelope = i / fadeLen; // fade in
  } else if (i > numSamples - fadeLen) {
    envelope = (numSamples - i) / fadeLen; // fade out
  }
  const sample = Math.round(AMPLITUDE * envelope * maxAmplitude * Math.sin(2 * Math.PI * FREQUENCY * t));
  buffer.writeInt16LE(sample, 44 + i * blockAlign);
}

// --- Write file ---
const outputDir = path.join(__dirname, '..', 'assets');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
const outputPath = path.join(outputDir, 'beep.wav');
fs.writeFileSync(outputPath, buffer);

console.log(`✅ Generated beep.wav (${DURATION}s, ${FREQUENCY}Hz, ${SAMPLE_RATE}Hz sample rate)`);
console.log(`   Output: ${outputPath}`);
console.log(`   Size: ${buffer.length} bytes`);
