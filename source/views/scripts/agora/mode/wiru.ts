import { IAgoraRTCClient } from "agora-rtc-sdk-ng";
import { RtmChannel } from "agora-rtm-sdk";
import { AgoraActionManager } from "../../utils/agoraActionManager";

export async function handleSukunaMode(rtcClient: IAgoraRTCClient, rtmChannel: RtmChannel, botId: string) {
  const agoraManager = new AgoraActionManager(rtcClient, rtmChannel, botId);
  
  const sounds = [
    "/assets/audio/wiru/kick/ganbare.mp3",
    "/assets/audio/wiru/kick/nigeruna.mp3",
  ];
  agoraManager.handleKickAndMuteSound(sounds);

  const firstEmotes = ["領", "域", "展", "開"];
  const secondEmotes = ["伏","魔","御","厨", "子"];

  sendSequentialEmojis(agoraManager, firstEmotes, 300, 500);

  sendSequentialEmojis(agoraManager, secondEmotes, 300, 3900);

  const firstTrack = await agoraManager.playTrack("/assets/audio/wiru/first.mp3");
  firstTrack.on("source-state-change", async (state) => {
    if (state === "stopped") {
      try {
        const audioManager = (window as any).audioManager;

        if (audioManager && typeof audioManager.getSelectedAudioFile === 'function') {
          const selectedAudio = audioManager.getSelectedAudioFile();
          
          if (selectedAudio && selectedAudio.path) {
            await agoraManager.playTrack(selectedAudio.path, true);
          } else {
            await agoraManager.playTrack("/assets/audio/users/wiru/second.m4a", true);
          }
        } else {
          await agoraManager.playTrack("/assets/audio/users/wiru/second.m4a", true);
        }
      } catch (error) {
        console.error('Failed to play audio, using default:', error);
        await agoraManager.playTrack("/assets/audio/wiru/second.m4a", true);
      }
      
      let charIndex = 0;
      let emojiIndex = 0;

      const message = "灰色の鎖が千切れ、黒き刃が降り注ぐ…無限の叫びが刃に刻まれ、伏魔の胎が歓喜に震える…切り刻まれるは魂か、世界か…";
      const emojis = [
        "🔪",  
        "🩸",  
        "📜", 
        "⚔️",  
        "⛓️",  
        "🌑",  
        "✂️",  
        "🪓",  
        "💥",  
        "🔨",  
        "🗡️",  
        "🩹",  
        "❌",  
        "🪚",  
        "🧨",
      ];
      
      setInterval(() => agoraManager.sendMessage(message[charIndex++ % message.length]), 100);
      setInterval(() => agoraManager.sendEmoji(emojis[emojiIndex++ % emojis.length]), 50);
      setInterval(() => agoraManager.requestLiftAudioMute(), 50);
    }
  });
}

function sendSequentialEmojis(agoraManager: AgoraActionManager, emotes: string[], delay: number, initialDelay = 0) {
  setTimeout(() => {
    emotes.forEach((emote, index) => {
      setTimeout(() => {
        agoraManager.sendEmoji(emote);
      }, delay * index);
    });
  }, initialDelay);
}