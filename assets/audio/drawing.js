// Audio generation for StudyFlow - Drawing pen sound effect
// This creates a scratching/drawing sound using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createDrawingAudio() {
  const buffer = audioContext.createBuffer(1, 44100 * 0.8, 44100); // 0.8 second duration
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < channelData.length; i++) {
    // Create a scratching sound effect
    const time = i / 44100;
    const noise = (Math.random() * 2 - 1) * 0.1; // White noise
    const tone = Math.sin(2 * Math.PI * 200 * time) * 0.05; // Low frequency component
    channelData[i] = (noise + tone) * Math.exp(-time * 2); // Combine with decay
  }
  
  return buffer;
}

window.drawingAudioBuffer = createDrawingAudio();