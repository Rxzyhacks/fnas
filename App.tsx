
import React, { useState, useEffect, useRef } from 'react';
import { MenuState } from './types';

// Facility Layout
const ROOMS = {
  GUEST_BEDROOM: { id: 'GUEST_BEDROOM', name: 'Guest Bedroom', x: 70, y: 320, connections: ['HALL_GB_H'] },
  HALL_GB_H: { id: 'HALL_GB_H', name: 'Main Hall A', x: 70, y: 220, connections: ['GUEST_BEDROOM', 'HALLWAY', 'HALL_GB_B'] },
  HALL_GB_B: { id: 'HALL_GB_B', name: 'Bathroom Hall', x: 200, y: 220, connections: ['HALL_GB_H', 'BATHROOM'] },
  BATHROOM: { id: 'BATHROOM', name: 'Bathroom', x: 330, y: 220, connections: ['HALL_GB_B'] },
  HALLWAY: { id: 'HALLWAY', name: 'Hallway', x: 70, y: 120, connections: ['HALL_GB_H', 'HALL_H_LR'] },
  HALL_H_LR: { id: 'HALL_H_LR', name: 'Main Hall B', x: 200, y: 120, connections: ['HALLWAY', 'LIVING_ROOM'] },
  LIVING_ROOM: { id: 'LIVING_ROOM', name: 'Living Room', x: 330, y: 120, connections: ['HALL_H_LR', 'HALL_LR_K', 'HALL_LR_MB'] },
  HALL_LR_K: { id: 'HALL_LR_K', name: 'Kitchen Hall', x: 330, y: 60, connections: ['LIVING_ROOM', 'KITCHEN'] },
  KITCHEN: { id: 'KITCHEN', name: 'Kitchen', x: 420, y: 60, connections: ['HALL_LR_K'] },
  HALL_LR_MB: { id: 'HALL_LR_MB', name: 'Suite Hall', x: 420, y: 120, connections: ['LIVING_ROOM', 'MAIN_BEDROOM'] },
  MAIN_BEDROOM: { id: 'MAIN_BEDROOM', name: 'Main Bedroom', x: 420, y: 210, connections: ['HALL_LR_MB'] },
};

const ROOM_MAP = ROOMS as Record<string, typeof ROOMS.GUEST_BEDROOM>;

type RoomId = keyof typeof ROOMS;

const DEATH_MESSAGES = [
  "sunibun shoved you in a locker",
  "sunibun deleted twisted",
  "sunibun kissed you with a brick",
  "sunibun banned you from existence",
  "sunibun forgot how to code and you glitched out"
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<'MENU' | 'FADING_OUT' | 'GAME_SCREEN' | 'JUMPSCARE' | 'GAMEOVER' | 'WIN'>('MENU');
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [isReady, setIsReady] = useState(false);
  const [showStartPopup, setShowStartPopup] = useState(false);
  const [deathMessage, setDeathMessage] = useState("");
  
  const [showSettings, setShowSettings] = useState(false);
  const [curvature, setCurvature] = useState(50);

  const [currentHour, setCurrentHour] = useState(0); 
  const [sunibunRoom, setSunibunRoom] = useState<RoomId>('MAIN_BEDROOM');
  const [sunibunMoveCount, setSunibunMoveCount] = useState(0);
  const [activePanel, setActivePanel] = useState<'CAM' | 'SOUND' | null>(null);
  const [soundUses, setSoundUses] = useState(0);
  const [isRebooting, setIsRebooting] = useState(false);
  const [rebootProgress, setRebootProgress] = useState(0);
  const [cameraRoom, setCameraRoom] = useState<RoomId>('MAIN_BEDROOM');
  const [isSwitchingCam, setIsSwitchingCam] = useState(false);

  const [camGlitchLevel, setCamGlitchLevel] = useState(0);

  const [transmittingTo, setTransmittingTo] = useState<RoomId | null>(null);
  const [activePulseAt, setActivePulseAt] = useState<RoomId | null>(null);
  const [mapPanX, setMapPanX] = useState(0);
  const [mapPanY, setMapPanY] = useState(0);

  // Task / Minigame states
  const [taskActive, setTaskActive] = useState(false);
  const [taskProgress, setTaskProgress] = useState(0);
  const [taskInput, setTaskInput] = useState("");
  const [taskTarget, setTaskTarget] = useState("");
  const [isHolding, setIsHolding] = useState(false);

  const officePanX = (0.5 - mousePos.x) * 20;
  const proximityAlertLevel = sunibunRoom === 'HALL_GB_H' ? 2 : 
    (ROOM_MAP['HALL_GB_H']?.connections.includes(sunibunRoom) ? 1 : 0);

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const menuDroneRef = useRef<GainNode | null>(null);
  const fanAmbienceRef = useRef<GainNode | null>(null);

  const initAudio = () => {
    if (audioCtxRef.current) return;
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  };

  const resetGame = () => {
    setGameState('MENU');
    setIsReady(false);
    setCurrentHour(0);
    setSunibunRoom('MAIN_BEDROOM');
    setSunibunMoveCount(0);
    setSoundUses(0);
    setIsRebooting(false);
    setTaskActive(false);
    setTaskProgress(0);
    setActivePanel(null);
    stopFanAmbience();
    if (!menuDroneRef.current) startMenuDrone();
  };

  const playHoverSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const playClickSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(20, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const playErrorSound = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(120, ctx.currentTime);
    osc.frequency.setValueAtTime(90, ctx.currentTime + 0.1);
    osc.frequency.setValueAtTime(60, ctx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  };

  const playLureAudioCue = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const duration = 1.5;
    const mainGain = ctx.createGain();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(45, ctx.currentTime);
    const amOsc = ctx.createOscillator();
    const amGain = ctx.createGain();
    amOsc.frequency.value = 12;
    amGain.gain.value = 0.5;
    mainGain.gain.setValueAtTime(0, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    mainGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    amOsc.connect(amGain);
    amGain.connect(mainGain.gain);
    osc.connect(mainGain);
    mainGain.connect(ctx.destination);
    osc.start();
    amOsc.start();
    osc.stop(ctx.currentTime + duration);
    amOsc.stop(ctx.currentTime + duration);
  };

  const startMenuDrone = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 2);
    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(55, ctx.currentTime);
    const osc2 = ctx.createOscillator();
    osc2.type = 'square';
    osc2.frequency.setValueAtTime(55.5, ctx.currentTime);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(200, ctx.currentTime);
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 100;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    menuDroneRef.current = gain;
  };

  const stopMenuDrone = () => {
    if (menuDroneRef.current) {
      menuDroneRef.current.gain.exponentialRampToValueAtTime(0.001, audioCtxRef.current!.currentTime + 1);
      setTimeout(() => {
        if (menuDroneRef.current) {
           menuDroneRef.current.disconnect();
           menuDroneRef.current = null;
        }
      }, 1100);
    }
  };

  const startFanAmbience = () => {
    if (!audioCtxRef.current) return;
    const ctx = audioCtxRef.current;
    const mainGain = ctx.createGain();
    mainGain.gain.setValueAtTime(0, ctx.currentTime);
    mainGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 3);
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.value = 400;
    noiseFilter.Q.value = 1;
    const hum = ctx.createOscillator();
    hum.type = 'sine';
    hum.frequency.value = 60;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.05;
    noise.connect(noiseFilter);
    noiseFilter.connect(mainGain);
    hum.connect(humGain);
    humGain.connect(mainGain);
    mainGain.connect(ctx.destination);
    noise.start();
    hum.start();
    fanAmbienceRef.current = mainGain;
  };

  const stopFanAmbience = () => {
    if (fanAmbienceRef.current) {
      fanAmbienceRef.current.gain.linearRampToValueAtTime(0, audioCtxRef.current!.currentTime + 0.5);
      fanAmbienceRef.current = null;
    }
  };

  const playJumpscareSound = () => {
    if (!audioCtxRef.current) return;
    const audioCtx = audioCtxRef.current;
    const duration = 1.2;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + duration);
    gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    const bufferSize = audioCtx.sampleRate * duration;
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    const dist = audioCtx.createWaveShaper();
    const makeDistortionCurve = (amount: number) => {
      const k = amount, n_samples = 44100, curve = new Float32Array(n_samples), deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
      }
      return curve;
    };
    dist.curve = makeDistortionCurve(400);
    osc.connect(dist);
    dist.connect(gain);
    noise.connect(noiseGain);
    gain.connect(audioCtx.destination);
    noiseGain.connect(audioCtx.destination);
    osc.start();
    noise.start();
    osc.stop(audioCtx.currentTime + duration);
    noise.stop(audioCtx.currentTime + duration);
  };

  // Time Progression Loop
  useEffect(() => {
    if (gameState !== 'GAME_SCREEN' || !isReady) return;

    const hourInterval = setInterval(() => {
      setCurrentHour(prev => {
        const next = prev + 1;
        if (next >= 6) {
          setGameState('WIN');
          return 6;
        }
        
        // Trigger a task for every new hour
        setTaskActive(true);
        setTaskProgress(0);
        setTaskInput("");
        setTaskTarget(Math.random().toString(36).substring(7).toUpperCase());
        
        return next;
      });
    }, 60000); 

    return () => clearInterval(hourInterval);
  }, [gameState, isReady]);

  // Hourly Tasks Handling
  useEffect(() => {
    if (!taskActive) return;
    
    let interval: number;
    if (isHolding && (currentHour <= 2)) {
      interval = window.setInterval(() => {
        setTaskProgress(prev => {
          const next = prev + 1.8;
          if (next >= 100) {
            setTaskActive(false);
            setIsHolding(false);
            return 100;
          }
          return next;
        });
      }, 50);
    }

    return () => clearInterval(interval);
  }, [taskActive, isHolding, currentHour]);

  // Camera Signal Logic
  useEffect(() => {
    if (activePanel !== 'CAM') {
      setCamGlitchLevel(0);
      return;
    }
    const interval = setInterval(() => {
      const isSunibunInCam = sunibunRoom === cameraRoom;
      const isSunibunAdjacent = ROOM_MAP[cameraRoom]?.connections.includes(sunibunRoom);
      const rand = Math.random();
      if (isSunibunInCam) setCamGlitchLevel(rand > 0.15 ? 2 : 1);
      else if (isSunibunAdjacent) setCamGlitchLevel(rand > 0.6 ? 1 : 0);
      else setCamGlitchLevel(rand > 0.98 ? 1 : 0);
    }, 150);
    return () => clearInterval(interval);
  }, [activePanel, cameraRoom, sunibunRoom]);

  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      stopFanAmbience();
      const msg = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)];
      setDeathMessage(msg);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'JUMPSCARE') {
      playJumpscareSound();
      const timer = setTimeout(() => setGameState('GAMEOVER'), 1200);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'GAME_SCREEN' && isReady) {
      setShowStartPopup(true);
      startFanAmbience();
      const timer = setTimeout(() => setShowStartPopup(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [gameState, isReady]);

  // Global Audio Unlock
  useEffect(() => {
    const unlock = () => {
      initAudio();
      if (gameState === 'MENU' && !menuDroneRef.current) startMenuDrone();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('click', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [gameState]);

  // Sunibun AI Movement
  useEffect(() => {
    if (gameState !== 'GAME_SCREEN' || !isReady) return;
    const baseInterval = 10000;
    const interval = Math.max(3000, baseInterval - (currentHour * 1400));

    const moveInterval = setInterval(() => {
      setSunibunRoom(prev => {
        if (currentHour === 0 && sunibunMoveCount >= 1) return prev;
        
        const connections = ROOM_MAP[prev]?.connections as RoomId[];
        const moveChoice = Math.random();
        let nextRoom: RoomId;
        if (moveChoice < 0.75) nextRoom = getNextStepToPlayer(prev);
        else nextRoom = connections[Math.floor(Math.random() * connections.length)];
        
        if (nextRoom === 'GUEST_BEDROOM') {
          setGameState('JUMPSCARE');
          return prev;
        }

        setSunibunMoveCount(c => c + 1);
        return nextRoom;
      });
    }, interval);

    return () => clearInterval(moveInterval);
  }, [gameState, isReady, currentHour, sunibunMoveCount]);

  const getNextStepToPlayer = (current: RoomId): RoomId => {
    if (current === 'MAIN_BEDROOM') return 'HALL_LR_MB';
    if (current === 'HALL_LR_MB') return 'LIVING_ROOM';
    if (current === 'KITCHEN') return 'HALL_LR_K';
    if (current === 'HALL_LR_K') return 'LIVING_ROOM';
    if (current === 'LIVING_ROOM') return 'HALL_H_LR';
    if (current === 'HALL_H_LR') return 'HALLWAY';
    if (current === 'HALLWAY') return 'HALL_GB_H';
    if (current === 'BATHROOM') return 'HALL_GB_B';
    if (current === 'HALL_GB_B') return 'HALL_GB_H';
    if (current === 'HALL_GB_H') return 'GUEST_BEDROOM';
    return current;
  };

  // Systems Handlers
  useEffect(() => {
    if (isRebooting) {
      const interval = setInterval(() => {
        setRebootProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsRebooting(false);
            setSoundUses(0);
            return 100;
          }
          return prev + (100 / (30000 / 300));
        });
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isRebooting]);

  const handleMenuClick = (state: MenuState) => {
    playClickSound();
    if (state === MenuState.NEW_GAME) {
      setGameState('FADING_OUT');
      stopMenuDrone();
      setTimeout(() => {
        setGameState('GAME_SCREEN');
        setTimeout(() => setIsReady(true), 2500);
      }, 1000); 
    }
  };

  const handleSwitchCam = (roomId: RoomId) => {
    if (cameraRoom === roomId) return;
    playHoverSound();
    setIsSwitchingCam(true);
    setCameraRoom(roomId);
    setTimeout(() => setIsSwitchingCam(false), 250);
  };

  const playSoundLure = (roomId: RoomId) => {
    if (isRebooting || soundUses >= 3 || transmittingTo) return;
    setTransmittingTo(roomId);
    playClickSound();

    setTimeout(() => {
      setTransmittingTo(null);
      setActivePulseAt(roomId);
      playLureAudioCue();
      setTimeout(() => setActivePulseAt(null), 1500);
      setSunibunRoom(prev => (Math.random() < 0.90 ? roomId : prev));
    }, 3000);
    
    const newUses = soundUses + 1;
    setSoundUses(newUses);
    if (newUses >= 3) {
      setIsRebooting(true);
      playErrorSound();
      setRebootProgress(0);
    }
  };

  const checkCodeTask = () => {
    if (taskInput.toUpperCase() === taskTarget) {
      setTaskActive(false);
    } else {
      setTaskInput("");
    }
  };

  // UI Handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (gameState === 'GAMEOVER') {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center overflow-hidden">
        <div className="animate-[pulse_0.1s_infinite] text-red-700 font-game-title text-7xl md:text-9xl mb-8 select-none">
          YOU DIED
        </div>
        <div className="text-white font-game-menu text-xl md:text-2xl tracking-widest opacity-80 text-center px-4" dangerouslySetInnerHTML={{ __html: deathMessage }} />
        <button onClick={resetGame} className="mt-20 text-white/30 hover:text-white transition-all font-game-menu uppercase tracking-[0.4em] text-sm">[ Retry Session ]</button>
      </div>
    );
  }

  if (gameState === 'WIN') {
    return (
      <div className="w-screen h-screen bg-black flex flex-col items-center justify-center text-green-500 font-game-title p-12 text-center">
        <h1 className="text-8xl animate-bounce mb-4">6:00 AM</h1>
        <p className="text-2xl mb-12 tracking-widest text-white/60 uppercase">Night Completed</p>
        <button onClick={resetGame} className="text-white hover:underline uppercase tracking-widest">[ Return ]</button>
      </div>
    );
  }

  return (
    <div className={`w-screen h-screen bg-black relative overflow-hidden select-none transition-opacity duration-[1000ms] ${gameState === 'FADING_OUT' ? 'opacity-0' : 'opacity-100'}`}>
      
      {/* HUD Layers & Overlays */}
      <div className="distortion-wrapper absolute inset-0 pointer-events-none z-20">
          <div className="noise-container" />
          <div className="grain-overlay" />
          <div className="crt-overlay" />
          <div className="scanline-effect" />
          <div className="vignette-overlay" />
      </div>

      {/* Main Content Conditional Rendering */}
      {gameState === 'MENU' ? (
        <div className="relative w-full h-full">
          <div className="strobe-effect" />
          <main className="relative z-10 w-full h-full flex flex-col justify-between p-12 md:p-24">
            <div style={{ transform: `translate(${(mousePos.x - 0.5) * 20}px, ${(mousePos.y - 0.5) * 20}px)` }}>
              <h1 className="text-4xl md:text-7xl font-bold uppercase tracking-tighter text-white leading-none glitch-text font-game-title">
                Five Nights<br />At <span className="text-[#f39c12]">Sunibuns</span>
              </h1>
            </div>
            <div className="flex flex-col items-start gap-8 mt-12 font-game-menu">
              <button onMouseEnter={playHoverSound} onClick={() => handleMenuClick(MenuState.NEW_GAME)} className="menu-item w-fit text-3xl md:text-4xl text-left text-gray-400 font-bold">New Game</button>
              <button className="menu-item w-fit text-3xl md:text-4xl text-left text-gray-400 font-bold transition-all duration-300 opacity-50 cursor-not-allowed">Continue</button>
              <button onMouseEnter={playHoverSound} onClick={() => { playClickSound(); setShowSettings(true); }} className="menu-item w-fit text-3xl md:text-4xl text-left text-gray-400 font-bold">Settings</button>
            </div>
            <div className="flex justify-between items-end mt-auto text-[10px] text-gray-600 font-mono tracking-widest uppercase opacity-40">
              <div><p>© 2026 Eren Aura / Sunibun Media</p><p>Hardware ID: SRV_7749</p></div>
            </div>
          </main>
          <div className="absolute right-0 bottom-0 md:right-20 md:top-20 w-1/2 h-3/4 md:w-1/2 md:h-1/2 z-0 overflow-hidden pointer-events-none">
            <img src="https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=1000&auto=format&fit=crop" alt="Anima" className="w-full h-full object-contain opacity-50" style={{ filter: 'grayscale(0.6) brightness(0.6) contrast(1.4) drop-shadow(0 0 60px rgba(0,0,0,1))' }} />
            <div className="absolute inset-0 bg-gradient-to-l from-transparent to-black" />
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center relative">
          {/* Office Background */}
          <div 
            className={`absolute inset-0 w-full h-full flex items-center justify-center transition-transform duration-[1500ms] ease-out pointer-events-none ${gameState === 'JUMPSCARE' ? 'jumpscare-animation scale-[2] brightness-[3] contrast-[2]' : ''}`}
            style={{ transform: gameState === 'JUMPSCARE' ? undefined : `translateX(${officePanX}%) scale(1.3)` }}
          >
            <img src="https://images.unsplash.com/photo-1615529182904-14819c35db37?q=80&w=2000&auto=format&fit=crop" alt="Office" className="w-full h-full object-cover brightness-[0.22] contrast-[1.3]" />
            {gameState === 'JUMPSCARE' && (
              <img src="https://images.unsplash.com/photo-1553279768-865429fa0078?q=80&w=1000&auto=format&fit=crop" className="absolute inset-0 w-full h-full object-contain scale-150 mix-blend-difference" style={{ filter: 'invert(1) saturate(50) brightness(1.5)' }} />
            )}
            <div className={`absolute inset-0 bg-red-600/15 transition-opacity duration-[2000ms] ${proximityAlertLevel >= 1 ? 'opacity-100 animate-pulse' : 'opacity-0'}`} />
            <div className={`absolute inset-0 bg-red-900/25 transition-opacity duration-500 ${proximityAlertLevel >= 2 ? 'opacity-100' : 'opacity-0'}`} />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" />
          </div>

          {/* Maintenance Tasks (Minigames) */}
          {taskActive && gameState === 'GAME_SCREEN' && (
            <div className="fixed inset-0 z-[200] bg-black/95 flex items-center justify-center p-4 backdrop-blur-sm">
               <div className="bg-gray-950 border-2 border-orange-500/50 p-8 max-w-sm w-full text-center space-y-6 shadow-[0_0_200px_rgba(249,115,22,0.25)] flex flex-col">
                  <div className="border-b border-white/10 pb-4 shrink-0">
                    <h4 className="text-orange-500 font-game-title text-xl uppercase tracking-widest">MAINTENANCE_H{currentHour}</h4>
                    <p className="text-white/40 font-game-menu text-[10px] mt-2 tracking-widest uppercase">System stabilization required.</p>
                  </div>
                  
                  <div className="space-y-6">
                    {(currentHour <= 2) && (
                      <div className="space-y-4">
                        <p className="text-white/70 font-game-menu text-[10px] uppercase">Reset core frequency trigger.</p>
                        <div className="h-4 w-full bg-gray-900 border border-white/10 rounded-full overflow-hidden p-0.5">
                           <div className="h-full bg-orange-600 transition-all duration-150 rounded-full" style={{ width: `${taskProgress}%` }} />
                        </div>
                        <button 
                          onMouseDown={() => setIsHolding(true)}
                          onMouseUp={() => setIsHolding(false)}
                          onMouseLeave={() => setIsHolding(false)}
                          className={`w-full py-6 text-white font-bold uppercase tracking-[0.4em] transition-all rounded shadow-2xl border-2 text-[10px] ${isHolding ? 'bg-orange-700 border-white' : 'bg-gray-900 border-orange-500/30'}`}
                        >
                          {isHolding ? 'STABILIZING...' : 'HOLD TO RESET'}
                        </button>
                      </div>
                    )}

                    {currentHour === 3 && (
                      <div className="space-y-4">
                        <p className="text-white/70 font-game-menu text-[10px] uppercase">Authentication code required:</p>
                        <div className="bg-black border border-white/20 p-4 text-orange-500 font-game-title text-3xl tracking-[0.4em]">{taskTarget}</div>
                        <input 
                          type="text"
                          autoFocus
                          value={taskInput}
                          onChange={(e) => setTaskInput(e.target.value.toUpperCase())}
                          onKeyDown={(e) => e.key === 'Enter' && checkCodeTask()}
                          className="w-full bg-gray-900 border-2 border-orange-500/50 text-white p-3 text-center font-game-title tracking-widest outline-none"
                          placeholder="CODE"
                        />
                        <button onClick={checkCodeTask} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold uppercase tracking-[0.2em] rounded text-[10px]">Authorize</button>
                      </div>
                    )}

                    {currentHour === 4 && (
                      <div className="space-y-4">
                        <p className="text-white/70 font-game-menu text-[10px] uppercase">Sync signal to 85%.</p>
                        <div className="flex flex-col items-center bg-black/50 p-4 rounded border border-white/5">
                          <input type="range" min="0" max="100" value={taskProgress} onChange={(e) => setTaskProgress(parseInt(e.target.value))} className="w-full h-1.5 bg-gray-800 accent-orange-600 appearance-none cursor-pointer rounded-full" />
                          <div className="mt-4 text-white font-game-title text-4xl">{taskProgress}%</div>
                        </div>
                        <button onClick={() => taskProgress >= 84 && taskProgress <= 86 && setTaskActive(false)} className={`w-full py-4 text-white font-bold uppercase tracking-[0.2em] border-2 rounded ${taskProgress >= 84 && taskProgress <= 86 ? 'bg-green-600 border-white' : 'bg-gray-900 border-white/20 opacity-40 cursor-not-allowed'} text-[10px]`}>Confirm Sync</button>
                      </div>
                    )}

                    {currentHour === 5 && (
                      <div className="space-y-4">
                        <p className="text-white/70 font-game-menu text-[10px] uppercase">Manual reset pulse.</p>
                        <div className="h-4 w-full bg-gray-900 border border-white/10 rounded-full overflow-hidden p-0.5">
                           <div className="h-full bg-red-600 transition-all duration-75 rounded-full" style={{ width: `${taskProgress}%` }} />
                        </div>
                        <button 
                          onClick={() => setTaskProgress(p => {
                            const n = p + 10;
                            if (n >= 100) { setTaskActive(false); return 100; }
                            return n;
                          })}
                          className="w-full py-8 bg-red-800 hover:bg-red-700 text-white font-bold uppercase tracking-[0.4em] border-4 border-white animate-bounce shadow-2xl text-xs"
                        >
                          PULSE
                        </button>
                      </div>
                    )}
                  </div>
               </div>
            </div>
          )}

          {/* Game UI HUD */}
          {isReady && gameState === 'GAME_SCREEN' && (
            <>
              <div className="absolute top-12 left-12 z-40 bg-black/80 px-6 py-4 border border-white/20 font-game-menu">
                <p className="text-white text-5xl font-bold">{currentHour === 0 ? '12' : currentHour}:00 <span className="text-xl">AM</span></p>
                <div className={`mt-2 flex items-center text-[10px] tracking-widest uppercase ${proximityAlertLevel >= 2 ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                   <div className={`w-2 h-2 rounded-full mr-2 ${proximityAlertLevel >= 2 ? 'bg-red-500' : 'bg-green-500'}`} />
                   {proximityAlertLevel >= 2 ? 'BREACH' : 'STABLE'}
                </div>
              </div>

              <div className="absolute bottom-12 inset-x-0 flex justify-between px-12 z-40">
                <button onClick={() => { playClickSound(); setActivePanel('CAM'); }} className="w-24 h-24 bg-black/90 border-2 border-white/10 hover:border-blue-500 flex flex-col items-center justify-center rounded transition-all">
                  <div className={`w-10 h-1 mb-2 ${activePanel === 'CAM' ? 'bg-blue-500' : 'bg-white/40'}`} />
                  <span className="text-[10px] uppercase text-white/50 tracking-widest">Cams</span>
                </button>
                <button onClick={() => { playClickSound(); setActivePanel('SOUND'); }} className="w-24 h-24 bg-black/90 border-2 border-white/10 hover:border-orange-500 flex flex-col items-center justify-center rounded transition-all">
                  <div className={`w-10 h-1 mb-2 ${activePanel === 'SOUND' ? 'bg-orange-500' : 'bg-white/40'}`} />
                  <span className="text-[10px] uppercase text-white/50 tracking-widest">Audio</span>
                </button>
              </div>
            </>
          )}

          {!isReady && gameState === 'GAME_SCREEN' && (
            <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center font-game-menu animate-out fade-out duration-[2000ms] fill-mode-forwards">
               <h2 className="text-6xl text-white font-bold tracking-widest animate-pulse">12:00 AM</h2>
               <p className="text-gray-400 mt-2 uppercase tracking-[0.5em]">Night 1</p>
            </div>
          )}

          {/* Panel Overlay */}
          {activePanel && gameState === 'GAME_SCREEN' && (
            <div className="absolute inset-10 z-[100] bg-black border-2 border-white/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 duration-300">
               <div className="bg-white/5 border-b border-white/10 p-4 flex justify-between items-center">
                  <h3 className="text-sm font-game-title tracking-widest uppercase flex items-center">
                    <span className={`w-2 h-2 rounded-full mr-2 ${activePanel === 'CAM' ? 'bg-blue-500' : 'bg-orange-500'}`} />
                    {activePanel === 'CAM' ? `CAM_FEED: ${ROOM_MAP[cameraRoom]?.name}` : 'AUDIO_LURE_INTERFACE'}
                  </h3>
                  <button onClick={() => { playClickSound(); setActivePanel(null); }} className="text-[10px] border border-white/10 px-4 py-2 hover:bg-red-900/40 uppercase">Shutdown</button>
               </div>
               
               <div className="flex-1 flex overflow-hidden">
                  <div className="flex-[3] relative bg-gray-950">
                    {activePanel === 'CAM' ? (
                      <div className="w-full h-full flex flex-col items-center justify-center relative">
                        {(camGlitchLevel > 0 || isSwitchingCam) && (
                          <div className={`absolute inset-0 cam-static-overlay ${isSwitchingCam ? 'opacity-100' : 'opacity-40'}`} />
                        )}
                        <p className="text-white/10 text-8xl font-black select-none tracking-tighter uppercase">{cameraRoom}</p>
                        {sunibunRoom === cameraRoom && (
                          <div className="absolute bg-red-800 text-white px-10 py-5 font-bold animate-pulse border-2 border-white shadow-2xl">
                             HAZARD DETECTED
                          </div>
                        )}
                        <div className="absolute top-4 left-4 text-red-600 font-bold flex items-center animate-pulse"><div className="w-3 h-3 bg-red-600 rounded-full mr-2" /> REC</div>
                      </div>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center p-12">
                        {isRebooting ? (
                          <div className="w-full max-w-md text-center">
                            <h4 className="text-orange-500 font-game-title mb-6 animate-pulse">REBOOTING_AUDIO_SYSTEMS</h4>
                            <div className="h-2 w-full bg-gray-900 border border-white/10 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-600 transition-all duration-300" style={{ width: `${rebootProgress}%` }} />
                            </div>
                          </div>
                        ) : (
                          <div className="text-center">
                            <div className="inline-block p-12 border-2 border-green-500/20 bg-green-500/5 rounded">
                              <p className={`text-3xl font-bold uppercase tracking-widest ${transmittingTo ? 'text-orange-500 animate-pulse' : 'text-green-500'}`}>
                                {transmittingTo ? 'TRANSMITTING_SIGNAL' : 'READY_TO_LURE'}
                              </p>
                              <p className="mt-4 text-[10px] text-white/30 uppercase">Select sector on map to deploy audio distraction.</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Map Panel */}
                  <div className="flex-[2] bg-black p-6 border-l border-white/10 flex flex-col">
                    <h4 className="text-white/40 text-[10px] uppercase tracking-widest mb-6">Facility Navigation</h4>
                    <div className="flex-1 relative bg-gray-900/50 rounded overflow-hidden">
                        <div className="absolute inset-0" style={{ transform: `translate(${mapPanX}px, ${mapPanY}px)` }}>
                           <svg className="absolute inset-0 w-full h-full">
                             {Object.values(ROOMS).map(room => room.connections.map(c => {
                               const t = ROOM_MAP[c];
                               if(!t) return null;
                               return <line key={`${room.id}-${c}`} x1={`${(room.x/450)*100}%`} y1={`${(room.y/350)*100}%`} x2={`${(t.x/450)*100}%`} y2={`${(t.y/350)*100}%`} stroke="white" strokeOpacity="0.1" />;
                             }))}
                           </svg>
                           {Object.values(ROOMS).map(room => (
                             <div key={room.id} className="absolute" style={{ left: `${(room.x/450)*100}%`, top: `${(room.y/350)*100}%`, transform: 'translate(-50%, -50%)' }}>
                                {activePulseAt === room.id && <div className="sonar-effect w-20 h-20 -ml-10 -mt-10" />}
                                <button 
                                  onClick={() => activePanel === 'CAM' ? handleSwitchCam(room.id as RoomId) : playSoundLure(room.id as RoomId)}
                                  className={`px-3 py-1.5 border text-[9px] font-bold uppercase transition-all rounded-sm
                                    ${cameraRoom === room.id && activePanel === 'CAM' ? 'bg-blue-600 border-white text-white' : 'bg-black/80 border-white/20 text-white/40 hover:border-white'}
                                    ${transmittingTo === room.id ? 'bg-orange-600 border-white text-white animate-pulse' : ''}
                                  `}
                                >
                                  {room.name}
                                </button>
                             </div>
                           ))}
                        </div>
                    </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[500] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-300">
           <div className="max-w-md w-full border border-gray-800 p-12 bg-black font-game-menu">
              <h2 className="text-3xl text-white font-bold mb-12 uppercase tracking-widest border-b border-gray-900 pb-8">Hardware Setup</h2>
              <div className="space-y-10">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between text-xs text-gray-400 uppercase tracking-widest">
                    <span>Barrel Intensity</span>
                    <span>{curvature}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={curvature} onChange={(e) => setCurvature(parseInt(e.target.value))} className="accent-[#f39c12] cursor-pointer h-1 bg-gray-800 rounded-lg appearance-none" />
                </div>
              </div>
              <button onClick={() => { playClickSound(); setShowSettings(false); }} className="mt-16 w-full py-4 border border-gray-700 hover:bg-white/5 text-white uppercase font-bold tracking-widest text-xs">Return</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
