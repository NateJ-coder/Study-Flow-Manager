// Audio generation for StudyFlow - Splash notification sound
// This creates a simple notification tone using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function createSplashAudio() {
  const buffer = audioContext.createBuffer(1, 44100 * 0.5, 44100); // 0.5 second duration
  const channelData = buffer.getChannelData(0);
  
  for (let i = 0; i < channelData.length; i++) {
    // Create a pleasant notification tone
    const time = i / 44100;
    channelData[i] = Math.sin(2 * Math.PI * 800 * time) * Math.exp(-time * 4) * 0.3; // 800Hz tone with decay
  }
  
  return buffer;
}

window.splashAudioBuffer = createSplashAudio();