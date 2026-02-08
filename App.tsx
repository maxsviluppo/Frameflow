// FORCED UPDATE: 2026-02-04 15:15 - RECAP MODAL FIX
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HexCellData, GameState } from './types';
import { INITIAL_TIME, BASE_POINTS_START, MAX_STREAK, GRID_ROWS, GRID_COLS, OPERATORS, MOCK_LEADERBOARD } from './constants';
import HexCell from './components/HexCell';
import ParticleEffect from './components/ParticleEffect';
import CharacterHelper from './components/CharacterHelper';
import { getIQInsights } from './services/geminiService';
import { soundService } from './services/soundService';
import { matchService } from './services/matchService';
import { Trophy, Timer, Zap, Brain, RefreshCw, ChevronRight, Play, Award, BarChart3, HelpCircle, Sparkles, Home, X, Volume2, VolumeX, User, Pause, Shield, Swords, Info, AlertTriangle, FastForward, Clock, Crown, Lock, Target, Send } from 'lucide-react';
import AuthModal from './components/AuthModal';
import AdminPanel from './components/AdminPanel';
import NeuralDuelLobby from './components/NeuralDuelLobby';
import DuelRecapModal from './components/DuelRecapModal';
import IntroVideo from './components/IntroVideo';
import ComicTutorial, { TutorialStep } from './components/ComicTutorial';
import UserProfileModal, { getRank } from './components/UserProfileModal'; // Updated import
import RegistrationSuccess from './components/RegistrationSuccess';
import { BADGES } from './constants/badges';
import { authService, profileService, leaderboardService, supabase, UserProfile } from './services/supabaseClient'; // Moved this import here

const TUTORIAL_STEPS = [
  {
    title: "OBIETTIVO & GRIGLIA",
    description: "Trova i 5 Target numerici usando le tessere a disposizione. La griglia è FISSA per ogni livello: trova tutte le combinazioni per avanzare.",
    icon: <Brain className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "REGOLE DI CONNESSIONE",
    description: "Trascina dai Numeri. Alterna sempre: Numero → Operatore → Numero. Non puoi collegare due tipi uguali consecutivamente.",
    icon: <RefreshCw className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "PUNTEGGIO & STREAK",
    description: "La precisione premia! Ogni risposta corretta consecutiva aumenta il moltiplicatore. Un errore azzera il moltiplicatore base.",
    icon: <Zap className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "SFIDE & CLASSIFICHE",
    description: "Oltre alla modalità Classica, competi in NEURAL DUEL (1vs1) e scala la Classifica Globale per Punti e Livello Massimo.",
    icon: <Swords className="w-12 h-12 text-[#FF8800]" />
  },
  {
    title: "QI RANKING AI",
    description: "L'AI analizza la tua velocità e precisione per stimare il tuo QI di gioco. Punta all'Eccellenza Neurale.",
    icon: <Award className="w-12 h-12 text-[#FF8800]" />
  }
];

const WIN_VIDEOS = ['/Win1noaudio.mp4', '/Win2noaudioe.mp4', '/Win3noaudio.mp4', '/Win4noaudio.mp4'];
const LOSE_VIDEOS = ['/Lose1noaudio.mp4', '/Lose2noaudio.mp4'];
const SURRENDER_VIDEOS = ['/Resa1noaudio.mp4'];

const BOSS_LEVELS = [
  {
    id: 1,
    requiredLevel: 5,
    title: "MATEMATICO",
    description: "Risolvi i calcoli!",
    targets: 10,
    time: 90,
    reward: "30s BONUS",
    bg: "bg-emerald-900"
  },
  {
    id: 2,
    requiredLevel: 10,
    title: "IL GUARDIANO",
    description: "Riflessi pronti, calcoli fulminei.",
    isComingSoon: true
  },
  {
    id: 3,
    requiredLevel: 25,
    title: "L'ARCHITETTO",
    description: "La struttura è tutto.",
    isComingSoon: true
  },
  {
    id: 4,
    requiredLevel: 40,
    title: "CERCATORE D'ORO",
    description: "Sequenze perfette o nulla.",
    isComingSoon: true
  },
  {
    id: 5,
    requiredLevel: 55,
    title: "CYBER DEMON",
    description: "Sconfiggi il codice.",
    isComingSoon: true
  },
  {
    id: 6,
    requiredLevel: 70,
    title: "VIBRANIUM",
    description: "Infrangibile come la tua logica.",
    isComingSoon: true
  },
  {
    id: 7,
    requiredLevel: 85,
    title: "ORACLE",
    description: "Prevedi il risultato.",
    isComingSoon: true
  },
  {
    id: 8,
    requiredLevel: 100,
    title: "TITANO",
    description: "Il peso della matematica.",
    isComingSoon: true
  },
  {
    id: 9,
    requiredLevel: 115,
    title: "NIGHTMARE",
    description: "Zero spazio per l'errore.",
    isComingSoon: true
  },
  {
    id: 10,
    requiredLevel: 130,
    title: "PHANTOM",
    description: "Numeri che appaiono e scompaiono.",
    isComingSoon: true
  },
  {
    id: 11,
    requiredLevel: 145,
    title: "GLITCH",
    description: "Domina il caos.",
    isComingSoon: true
  },
  {
    id: 12,
    requiredLevel: 160,
    title: "NEBULA",
    description: "Oltre i confini del calcolo.",
    isComingSoon: true
  },
  {
    id: 13,
    requiredLevel: 175,
    title: "SUPERNOVA",
    description: "Un'esplosione di cifre.",
    isComingSoon: true
  },
  {
    id: 14,
    requiredLevel: 190,
    title: "QUANTUM",
    description: "Tutto e niente allo stesso tempo.",
    isComingSoon: true
  },
  {
    id: 15,
    requiredLevel: 205,
    title: "SINGULARITY",
    description: "Il punto di non ritorno.",
    isComingSoon: true
  },
  {
    id: 16,
    requiredLevel: 220,
    title: "ORIGIN",
    description: "Dove tutto ebbe inizio.",
    isComingSoon: true
  }
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    totalScore: 0,
    streak: 0,
    level: 1,
    timeLeft: INITIAL_TIME,
    targetResult: 0,
    status: 'intro',
    estimatedIQ: 100,
    lastLevelPerfect: true,
    basePoints: BASE_POINTS_START,
    levelTargets: [],
    isBossLevel: false,
    bossLevelId: null as number | null,
  });

  const [grid, setGrid] = useState<HexCellData[]>([]);
  const [selectedPath, setSelectedPath] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [previewResult, setPreviewResult] = useState<number | null>(null);
  const [insight, setInsight] = useState<string>("");

  const [activeModal, setActiveModal] = useState<'leaderboard' | 'tutorial' | 'admin' | 'duel' | 'duel_selection' | 'resume_confirm' | 'logout_confirm' | 'profile' | 'registration_success' | 'boss_selection' | 'full_reset_confirm' | null>(null);
  const [activeMatch, setActiveMatch] = useState<{ id: string, opponentId: string, isDuel: boolean, isP1: boolean } | null>(null);
  const [duelMode, setDuelMode] = useState<'standard' | 'blitz'>('standard');
  const [opponentScore, setOpponentScore] = useState(0);
  const [opponentTargets, setOpponentTargets] = useState(0);
  const [duelRounds, setDuelRounds] = useState({ p1: 0, p2: 0, current: 1 });
  const [tutorialStep, setTutorialStep] = useState(0);
  const [targetAnimKey, setTargetAnimKey] = useState(0);
  const [scoreAnimKey, setScoreAnimKey] = useState(0);
  const [isVictoryAnimating, setIsVictoryAnimating] = useState(false);
  const [triggerParticles, setTriggerParticles] = useState(false);
  const [toast, setToast] = useState<{ message: string, visible: boolean, actions?: { label: string, onClick: () => void, variant?: 'primary' | 'secondary' }[] }>({ message: '', visible: false });
  const [isMuted, setIsMuted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showLostVideo, setShowLostVideo] = useState(false);
  const [showBossIntro, setShowBossIntro] = useState(false);
  const [isBossBonusPlaying, setIsBossBonusPlaying] = useState(false);
  const [showHomeTutorial, setShowHomeTutorial] = useState(false);
  const [showGameTutorial, setShowGameTutorial] = useState(false);
  const theme = 'orange';
  const [levelBuffer, setLevelBuffer] = useState<{ grid: HexCellData[], targets: number[] }[]>([]);
  const timerRef = useRef<number | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const winAudioRef = useRef<HTMLAudioElement | null>(null);

  // Supabase Integration
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [logoAnim, setLogoAnim] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const gameStateRef = useRef<GameState>(gameState);
  const prevRoundRef = useRef(1);
  const processedWinRef = useRef<string | null>(null);
  const selectionTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Keep duelRoundsRef in sync
  const duelRoundsRef = useRef(duelRounds);
  useEffect(() => {
    duelRoundsRef.current = duelRounds;
  }, [duelRounds]);


  // Logo Animation Effect
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Silenziamo i falsi positivi di AbortError (spesso causati da Supabase quando si naviga velocemente)
      const isAbortError = (event.reason?.name === 'AbortError' || event.reason?.message?.includes('signal is aborted without reason'));
      if (isAbortError) {
        event.preventDefault(); // Impedisce al browser di mostrare il banner di errore/overlay
        console.debug("🔇 Silenziato AbortError:", event.reason.message);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const interval = setInterval(() => {
      setLogoAnim(true);
      setTimeout(() => setLogoAnim(false), 2000); // Slower breath (2s)
    }, 8000); // Slightly more frequent

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      clearInterval(interval);
    };
  }, []);
  useEffect(() => {
    if (gameState.isBossLevel) {
      document.body.style.background = '#022c22'; // emerald-950
      document.documentElement.style.background = '#022c22';
    } else {
      document.body.style.background = '#020617'; // Default Slate-950
      document.documentElement.style.background = '#020617';
    }
    return () => {
      document.body.style.background = '#020617';
      document.documentElement.style.background = '#020617';
    };
  }, [gameState.isBossLevel]);

  const [leaderboardData, setLeaderboardData] = useState<any[]>([]);

  const [savedGame, setSavedGame] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [pauseLocked, setPauseLocked] = useState(false);
  const [winVideoSrc, setWinVideoSrc] = useState(WIN_VIDEOS[0]);
  const [loseVideoSrc, setLoseVideoSrc] = useState(LOSE_VIDEOS[0]);
  const [surrenderVideoSrc, setSurrenderVideoSrc] = useState(SURRENDER_VIDEOS[0]);
  const [showSurrenderVideo, setShowSurrenderVideo] = useState(false);
  const [isVideoVisible, setIsVideoVisible] = useState(false);

  // NEW STATE FOR DUEL RECAP
  const [showDuelRecap, setShowDuelRecap] = useState(false);
  const [latestMatchData, setLatestMatchData] = useState<any>(null); // NEW: Full Match Object Store

  // NEW: Video Intro State
  const [showIntro, setShowIntro] = useState(true);
  const [onlinePlayers, setOnlinePlayers] = useState<any[]>([]);
  const [pendingMatchInvite, setPendingMatchInvite] = useState<string | null>(null);
  const [isJoiningPending, setIsJoiningPending] = useState(false);

  // FAILSAFE: Force Intro End after timeout to prevent boot freeze
  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        console.warn("⚠️ BOOT SYSTEM: Intro sequence timed out - Force entering app");
        setShowIntro(false);
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }, 6000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);

  // FORCE SCROLL RESET ON IDLE (Home Screen Stability)
  useEffect(() => {
    if (gameState.status === 'idle' && !activeModal) {
      window.scrollTo(0, 0);
      document.body.scrollTop = 0;
    }
  }, [gameState.status, activeModal]);




  const handleUserInteraction = useCallback(async () => {
    await soundService.init();
  }, []);

  const showToast = useCallback((message: string, actions?: { label: string, onClick: () => void, variant?: 'primary' | 'secondary' }[]) => {
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setToast({ message, visible: true, actions });
    // Durata ridotta: 2.5 secondi per toast normali, 6 secondi se ci sono azioni
    toastTimeoutRef.current = window.setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, actions ? 6000 : 2500);
  }, []);

  // DETERMINISTIC RNG HELPERS
  const stringToSeed = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  };

  const seededRandom = (seed: number) => {
    return () => {
      seed |= 0; seed = seed + 0x6d2b79f5 | 0;
      var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };


  const getDifficultyRange = (level: number) => {
    // NUOVA CURVA: Progressione molto più graduale - difficoltà livello 20 ora al livello 80
    if (level <= 10) return { min: 1, max: 12 };       // Inizio molto facile (solo somme/sottrazioni)
    if (level <= 20) return { min: 3, max: 18 };       // Ancora facile, preparazione per ×
    if (level <= 40) return { min: 5, max: 25 };       // Introduzione graduale di ×
    if (level <= 60) return { min: 8, max: 35 };       // × più frequente
    if (level <= 80) return { min: 10, max: 50 };      // Preparazione per ÷ (era livello 20)
    if (level <= 100) return { min: 15, max: 65 };     // ÷ più frequente

    // Progressione lineare molto graduale per livelli avanzati
    return { min: 20 + Math.floor((level - 100) * 1.5), max: 65 + Math.floor((level - 100) * 3) };
  };

  // Helper: Calculate result from a cell path (for solver)
  const calculateResultFromCells = (cells: HexCellData[]): number | null => {
    if (cells.length < 1) return null;
    try {
      let result = 0;
      let currentOp = '+';
      let hasStarted = false;

      for (let i = 0; i < cells.length; i++) {
        const part = cells[i].value;
        if (OPERATORS.includes(part)) {
          currentOp = part;
        } else {
          const num = parseInt(part);
          if (!hasStarted) {
            result = num;
            hasStarted = true;
          } else {
            if (currentOp === '+') result += num;
            else if (currentOp === '-') result -= num;
            else if (currentOp === '×') result *= num;
            else if (currentOp === '÷') result = num !== 0 ? Math.floor(result / num) : result;
          }
        }
      }
      return result;
    } catch (e) {
      return null;
    }
  };

  // Helper: Check adjacency (rectilinear for orange theme)
  const areCellsAdjacent = (cell1: HexCellData, cell2: HexCellData): boolean => {
    const dr = Math.abs(cell1.row - cell2.row);
    const dc = Math.abs(cell1.col - cell2.col);
    return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
  };

  // SOLVER: Find all valid paths and their results
  const findAllSolutions = (gridCells: HexCellData[]): Set<number> => {
    if (!gridCells) return new Set();
    const solutions = new Set<number>();
    const maxPathLength = 7; // N-Op-N-Op-N-Op-N = 7 cells max

    const explorePath = (currentPath: HexCellData[], visited: Set<string>) => {
      const lastCell = currentPath[currentPath.length - 1];

      // Calculate if path is valid (at least 3 cells: N-Op-N)
      if (currentPath.length >= 3 && currentPath.length % 2 === 1) {
        const result = calculateResultFromCells(currentPath);
        if (result !== null && result > 0) {
          solutions.add(result);
        }
      }

      if (currentPath.length >= maxPathLength) return;

      // Try all adjacent cells
      for (const nextCell of gridCells) {
        if (visited.has(nextCell.id)) continue;
        if (lastCell.type === nextCell.type) continue;
        if (!areCellsAdjacent(lastCell, nextCell)) continue;

        const newVisited = new Set(visited);
        newVisited.add(nextCell.id);
        explorePath([...currentPath, nextCell], newVisited);
      }
    };

    // Start from every number cell
    const numberCells = gridCells.filter(c => c.type === 'number');
    for (const startCell of numberCells) {
      explorePath([startCell], new Set([startCell.id]));
    }

    return solutions;
  };

  // BOSS UNLOCK CHECKER
  useEffect(() => {
    if (gameState.status === 'idle' && userProfile) {
      // BOSS 1 UNLOCK (Level > 5)
      if ((userProfile.max_level || 1) > 5) {
        const key = `boss_unlock_seen_1_${userProfile.id}`;
        if (localStorage.getItem(key) !== 'true') {
          setTimeout(() => {
            // Play Unlock Video (Placeholder for now)
            setShowHomeTutorial(false); // Hide tutorial if overlapping
            showToast("⚠️ LIVELLO BOSS SBLOCCATO!", [{ label: "GIOCA ORA", onClick: () => setActiveModal('boss_selection') }]);
            soundService.playBadge(); // Alert Sound
            localStorage.setItem(key, 'true');
          }, 3000);
        }
      }
    }
  }, [gameState.status, userProfile, showToast]);

  const createLevelData = useCallback((level: number, seedStr?: string, targetCount: number = 5) => {
    const { min, max } = getDifficultyRange(level);
    let attempts = 0;
    const maxAttempts = 20;

    // Initialize RNG
    const rng = seedStr ? seededRandom(stringToSeed(seedStr)) : Math.random;

    // Helper: Weighted numbers for early levels
    const getWeightedNumber = () => {
      // Numeri più piccoli per molti più livelli (fino al 60)
      if (level <= 60) {
        const r = rng();
        // 60% chance of small numbers (1-4), 30% mid (5-7), 10% high (8-9) or 0
        if (r < 0.60) return Math.floor(rng() * 4) + 1;
        if (r < 0.90) return Math.floor(rng() * 3) + 5;
        return Math.floor(rng() * 3) + 7;
      }
      return Math.floor(rng() * 10);
    };

    // Helper: generate a balanced pool of operators to distribute spatially
    const generateBalancedOperatorPool = (count: number) => {
      const pool = [];
      let weights = { '+': 0.35, '-': 0.35, '×': 0.20, '÷': 0.10 };

      // NUOVA PROGRESSIONE: Introduzione molto più graduale degli operatori
      if (level <= 15) {
        // Livelli 1-15: Solo addizione e sottrazione
        weights = { '+': 0.50, '-': 0.50, '×': 0.0, '÷': 0.0 };
      }
      else if (level <= 25) {
        // Livelli 16-25: Prima introduzione della moltiplicazione (10%)
        weights = { '+': 0.45, '-': 0.45, '×': 0.10, '÷': 0.0 };
      }
      else if (level <= 40) {
        // Livelli 26-40: Moltiplicazione aumenta gradualmente (20%)
        weights = { '+': 0.40, '-': 0.40, '×': 0.20, '÷': 0.0 };
      }
      else if (level <= 50) {
        // Livelli 41-50: Moltiplicazione più frequente (30%), ancora niente divisione
        weights = { '+': 0.35, '-': 0.35, '×': 0.30, '÷': 0.0 };
      }
      else if (level <= 65) {
        // Livelli 51-65: Prima introduzione della divisione (5%)
        weights = { '+': 0.35, '-': 0.30, '×': 0.30, '÷': 0.05 };
      }
      else if (level <= 80) {
        // Livelli 66-80: Divisione aumenta (10%)
        weights = { '+': 0.30, '-': 0.30, '×': 0.30, '÷': 0.10 };
      }
      else if (level <= 100) {
        // Livelli 81-100: Bilanciamento verso operatori complessi
        weights = { '+': 0.25, '-': 0.30, '×': 0.30, '÷': 0.15 };
      }
      // Livelli 100+: Massima difficoltà
      else {
        weights = { '+': 0.25, '-': 0.25, '×': 0.30, '÷': 0.20 };
      }

      for (let i = 0; i < count; i++) {
        const r = rng();
        if (r < weights['+']) pool.push('+');
        else if (r < weights['+'] + weights['-']) pool.push('-');
        else if (r < weights['+'] + weights['-'] + weights['×']) pool.push('×');
        else pool.push('÷');
      }

      // Shuffle pool (Fisher-Yates) for uniform distribution
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool;
    };

    while (attempts < maxAttempts) {
      attempts++;

      // Count operators needed
      let opCount = 0;
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          if ((r + c) % 2 !== 0) opCount++;
        }
      }

      const opPool = generateBalancedOperatorPool(opCount);
      let opIndex = 0;

      // Generate random grid with spatial distribution logic
      const newGrid: HexCellData[] = [];
      for (let r = 0; r < GRID_ROWS; r++) {
        for (let c = 0; c < GRID_COLS; c++) {
          const isOperator = (r + c) % 2 !== 0;
          newGrid.push({
            id: `${r}-${c}`,
            row: r,
            col: c,
            type: isOperator ? 'operator' : 'number',
            value: isOperator
              ? (opPool[opIndex++] || '+')
              : getWeightedNumber().toString(),
          });
        }
      }

      // Find all possible solutions
      const allSolutions = findAllSolutions(newGrid);
      const validSolutions = Array.from(allSolutions).filter(n => n >= min && n <= max);

      // Need at least 5 unique solutions. 
      // Ensure we pick solution targets that are somewhat spread out (numerically) if possible, or just shuffle well.
      if (validSolutions.length >= 5) {
        // Better shuffle for targets using deterministic RNG
        const shuffled = validSolutions.sort(() => rng() - 0.5);
        // Double shuffle
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(rng() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const targets = shuffled.slice(0, targetCount);

        // Extra check: If low level, ensure targets aren't too close to each other? 
        // No, randomness is fine as long as they are distinct.
        return { grid: newGrid, targets };
      }
    }

    // Fallback: simpler grid if generation fails often
    console.warn(`Level ${level}: Using fallback grid generation`);
    const newGrid: HexCellData[] = [];
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isOperator = (r + c) % 2 !== 0;
        newGrid.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          type: isOperator ? 'operator' : 'number',
          value: isOperator ? '+' : Math.floor(rng() * 5).toString(), // Fallback to very simple (Deterministic)
        });
      }
    }
    // Generate simple targets for fallback
    const targets = [];
    for (let i = 0; i < targetCount; i++) targets.push(Math.floor(rng() * (max - min + 1)) + min);

    return { grid: newGrid, targets };
  }, []);

  const generateBossLevel = useCallback((bossId: number) => {
    const boss = BOSS_LEVELS.find(b => b.id === bossId);
    if (!boss) return null;

    const targetCount = boss.targets;
    const newGrid: HexCellData[] = [];
    const rng = Math.random;

    // 1. Create balanced Grid first
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const isOperator = (r + c) % 2 !== 0;
        newGrid.push({
          id: `${r}-${c}`,
          row: r,
          col: c,
          type: isOperator ? 'operator' : 'number',
          value: isOperator
            ? (rng() > 0.5 ? '+' : '-')
            : Math.floor(rng() * 10).toString(), // 0-9
        });
      }
    }

    // 2. Find all solutions
    const allSolutions = findAllSolutions(newGrid);
    const validSolutions = Array.from(allSolutions).filter(n => n >= 1 && n <= 18);

    // 3. Create Targets
    const finalTargets: { value: number, displayValue: string, completed: boolean }[] = [];
    const shuffledSolutions = validSolutions.sort(() => rng() - 0.5);

    for (const sol of shuffledSolutions) {
      if (finalTargets.length >= targetCount) break;
      let a = Math.floor(rng() * 9) + 1; // 1-9
      let b = sol - a;
      let op = '+';

      // If subtraction or if addition would result in negative b
      if (rng() > 0.5 || b < 1) {
        b = Math.floor(rng() * 9) + 1; // 1-9
        a = sol + b;
        op = '-';
      }
      if (op === '+' && b <= 0) { b = 1; a = sol - 1; }

      finalTargets.push({
        value: sol,
        displayValue: `${a} ${op} ${b}`,
        completed: false
      });
    }

    while (finalTargets.length < targetCount) {
      finalTargets.push({ value: 5, displayValue: "3 + 2", completed: false });
    }

    return { grid: newGrid, targets: finalTargets };
  }, [findAllSolutions]);

  const startBossGame = (bossId: number) => {
    // Safety check: Don't allow re-playing defeated bosses
    const isDefeated = userProfile?.badges?.includes(bossId === 1 ? 'boss_matematico' : `boss_${bossId}_defeated`);
    if (isDefeated) {
      showToast('Hai già sconfitto questo boss!');
      return;
    }

    const levelData = generateBossLevel(bossId);
    if (!levelData) return;

    setActiveModal(null);
    setGrid(levelData.grid);

    // CRITICAL FIX: Preserve career level during boss challenges
    // Boss levels are separate challenges and should NOT overwrite max_level
    const careerLevel = userProfile?.max_level || 1;

    if (bossId === 1) {
      // PREPARE LEVEL BUT DON'T START YET
      setGameState(prev => ({
        ...prev,
        score: 0,
        totalScore: 0,
        streak: 0,
        level: careerLevel, // PRESERVE CAREER LEVEL
        isBossLevel: true,
        bossLevelId: bossId,
        timeLeft: 90,
        targetResult: 0,
        status: 'idle', // Stay idle until video ends
        levelTargets: levelData.targets,
      }));

      // SHOW BOSS INTRO
      setShowBossIntro(true);
      setIsVideoVisible(true);
      if (videoRef.current) {
        videoRef.current.src = '/Boss1intro.mp4';
        videoRef.current.muted = true; // REQUIRED for browser autoplay policy
        videoRef.current.load();
        videoRef.current.play().catch(e => {
          console.warn("Boss intro blocked:", e);
        });
      }
    } else {
      setGameState(prev => ({
        ...prev,
        score: 0,
        totalScore: 0, // Boss level starts at 0 pts
        streak: 0,
        level: careerLevel, // PRESERVE CAREER LEVEL
        isBossLevel: true,
        bossLevelId: bossId,
        timeLeft: 90,
        targetResult: 0,
        status: 'playing',
        levelTargets: levelData.targets,
      }));
      soundService.playSuccess();
    }
  };

  const generateGrid = useCallback((forceStartLevel?: number, forcedSeed?: string) => {
    let nextLevelData;
    let newBuffer = [...levelBuffer];

    const currentLevel = forceStartLevel !== undefined ? forceStartLevel : gameState.level;

    const targetCount = 5; // User requested 5 targets always valid, even for Blitz

    if (newBuffer.length === 0 || forceStartLevel !== undefined || forcedSeed) {
      // If we have a forced seed (DUEL MODE), generate exactly that board
      newBuffer = [];
      nextLevelData = createLevelData(currentLevel, forcedSeed, targetCount);
      for (let i = 1; i <= 5; i++) {
        newBuffer.push(createLevelData(currentLevel + i, undefined, targetCount));
      }
    } else {
      // Shift buffer (Normal progression)
      nextLevelData = newBuffer.shift()!;
      // Replenish buffer
      newBuffer.push(createLevelData(gameState.level + 6, undefined, targetCount));
    }

    setGrid(nextLevelData.grid);
    setLevelBuffer(newBuffer);

    setGameState(prev => ({
      ...prev,
      score: 0, // CRITICAL: Reset level points when generating new grid
      targetResult: 0,
      levelTargets: nextLevelData.targets.map(t => ({ value: t, completed: false }))
    }));
    setTargetAnimKey(k => k + 1);
  }, [levelBuffer, createLevelData, gameState.level]);

  // BADGE CHECKER
  const resetDuelState = async (matchId?: string, userId?: string) => {
    // 1. If currently in a match, ABANDON it properly on DB
    if (matchId && userId) {
      console.log("🏳️ Abandoning Match:", matchId);
      await matchService.abandonMatch(matchId, userId);
    }

    setActiveMatch(null);
    setDuelRounds({ p1: 0, p2: 0, current: 0 });
    setOpponentScore(0);
    setOpponentTargets(0);
    setShowDuelRecap(false);
    setGameState(prev => ({ ...prev, status: 'idle' }));
    setIsVideoVisible(false);
    setShowSurrenderVideo(false);
    setShowVideo(false);
    setShowLostVideo(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const checkAndUnlockBadges = useCallback(async (profile: any) => {
    if (!profile) return;
    const unlockedIds = profile.badges || [];
    const newBadges: string[] = [];

    BADGES.forEach(badge => {
      if (!unlockedIds.includes(badge.id)) {
        if (badge.condition(profile)) {
          newBadges.push(badge.id);
          // Toast Notification
          showToast(`🏆 Medaglia Sbloccata: ${badge.title}!`);
          soundService.playSuccess();
        }
      }
    });

    if (newBadges.length > 0) {
      const updatedBadges = [...unlockedIds, ...newBadges];
      // Update Local
      setUserProfile(prev => prev ? ({ ...prev, badges: updatedBadges }) : null);
      // Update Remote
      await profileService.updateProfile({ id: profile.id, badges: updatedBadges });
    }
  }, [showToast]);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const profile = await profileService.getProfile(userId);
      const save = await profileService.loadGameState(userId);
      if (save) setSavedGame(save);
      if (profile) {
        setUserProfile(profile);

        // Sync Bonus State from DB (Source of Truth) to LocalStorage
        if (profile.career_time_bonus !== undefined) {
          localStorage.setItem('career_time_bonus', profile.career_time_bonus.toString());
        } else {
          // If undefined (new user?), clear it to be safe
          localStorage.removeItem('career_time_bonus');
        }

        // Check for Badges on Load (In case of missed updates or offline play sync)
        checkAndUnlockBadges(profile);

        setGameState(prev => ({
          ...prev,
          // Only update stats if they are better in DB (usually sync handles this, but just in case)
          estimatedIQ: profile.estimated_iq || 100
        }));
      }
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error("Error loading profile:", error);
      }
    }
  }, [checkAndUnlockBadges]);

  // Initialize Session & Handle Auth Redirects (Email Config etc.)
  useEffect(() => {
    // 1. Check current session immediately
    authService.getCurrentSession().then(session => {
      if (session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);
      }
    }).catch(e => {
      // Silent error for session check
    });

    // 2. Listen for Auth Changes (Login, Logout, Email Confirmation Redirects)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth Event:', event);

      if (event === 'SIGNED_IN' && session?.user) {
        setCurrentUser(session.user);
        loadProfile(session.user.id);


        // Show Welcome Message ONLY if it's a new registration or recovery
        const username = session.user.user_metadata?.username || 'Giocatore';
        const isSignup = window.location.hash && (window.location.hash.includes('type=signup') || window.location.hash.includes('type=recovery'));

        if (isSignup) {
          const welcomeMsg = `🎉 Account Confermato! Benvenuto in Number, ${username}!`;
          showToast(welcomeMsg, [{ label: 'Profilo', onClick: () => setActiveModal('profile') }]);
        }
        // Else: Standard login, silent entry (no toast)

        // Close modals if open
        setShowAuthModal(false);
      }

      if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setUserProfile(null);
        setSavedGame(null);
        localStorage.removeItem('career_time_bonus'); // Clear sensitive session data
        resetDuelState(); // Ensure match state is cleared locally
        setGameState(prev => ({ ...prev, status: 'idle' }));
        showToast("Disconnessione completata.");
      }

      if (event === 'USER_UPDATED') {
        // Handle password recovery or profile update events
        if (session?.user) {
          setCurrentUser(session.user);
          loadProfile(session.user.id);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadProfile, showToast]);

  // GLOBAL PRESENCE & CHALLENGE NOTIFICATION
  useEffect(() => {
    if (!currentUser) {
      setOnlinePlayers([]);
      return;
    }

    // 1. GLOBAL PRESENCE TRACKING
    const globalChannel = (supabase as any)
      .channel('global_online_users', {
        config: { presence: { key: currentUser.id } }
      })
      .on('presence', { event: 'sync' }, () => {
        const state = globalChannel.presenceState();
        const players = Object.values(state).map((presence: any) => presence[0]);
        setOnlinePlayers(players);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await globalChannel.track({
            id: currentUser.id,
            username: userProfile?.username || currentUser.user_metadata?.username || 'Guerriero',
            avatar_url: userProfile?.avatar_url,
            level: userProfile?.max_level || 1,
            online_at: new Date().toISOString()
          });
        }
      });

    // 2. GLOBAL CHALLENGE LISTENER
    const invitesChannel = (supabase as any)
      .channel('global_invites')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'matches',
        filter: `player2_id=eq.${currentUser.id}`
      }, (payload: any) => {
        const newMatch = payload.new;
        if (newMatch.status === 'invite_pending') {
          // Play badge sound
          soundService.playBadge();
          // Show toast with action - Updated to DIRECT ACCEPT
          showToast(`🎮 Nuova Sfida Ricevuta! Modalità: ${newMatch.mode.toUpperCase().replace('_', ' ')}`, [
            {
              label: 'Accetta',
              onClick: () => {
                setPendingMatchInvite(newMatch.id);
              },
              variant: 'primary'
            }
          ]);
        }
      })
      .subscribe();

    return () => {
      (supabase as any).removeChannel(globalChannel);
      (supabase as any).removeChannel(invitesChannel);
    };
  }, [currentUser, userProfile, showToast]);

  // 3. Game Over Trigger on Time Left reaching zero
  useEffect(() => {
    if (gameState.status === 'playing' && gameState.timeLeft === 0 && !isVictoryAnimating) {
      // TIME ATTACK END (Duel)
      if (activeMatch?.mode === 'time_attack' || activeMatch?.mode === 'blitz') {
        handleTimeAttackEnd();
        return;
      }

      // STANDARD GAME OVER (Single Player)
      if (!activeMatch?.isDuel) {
        setGameState(prev => ({ ...prev, status: 'game-over' }));
        if (currentUser) {
          // MODIFIED: Keep saved game to allow Retry/Checkpoint behavior
          // profileService.clearSavedGame(currentUser.id);
          loadProfile(currentUser.id);
        }

        // VIDEO UNLOCK - AUTO PLAY MUTED ON TIMEOUT (Browser Policy)
        let loseVid = '';
        if (gameState.bossLevelId === 1) {
          loseVid = '/Boss1sconfitta.mp4';
        } else {
          const loseIdx = Math.floor(Math.random() * LOSE_VIDEOS.length);
          loseVid = LOSE_VIDEOS[loseIdx];
          // Play Synchronized Audio Track (Lose1.mp3 / Lose2.mp3)
          soundService.playLose(loseIdx);
        }

        setLoseVideoSrc(loseVid);
        setShowLostVideo(true);
        setIsVideoVisible(true);

        // Force ref update in next tick to ensure element exists
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.src = loseVid;
            videoRef.current.muted = true; // REQUIRED for auto-play without click
            videoRef.current.load();
            const playPromise = videoRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(e => console.warn("Loss video autoplay blocked:", e));
            }
          }
        }, 0);
      }
    } else if (gameState.status === 'playing' && !activeMatch?.isDuel && gameState.timeLeft <= 5 && gameState.timeLeft > 0) {
      // LOW TIME WARNING (Single Player Only)
      // Play a tick/beep for the last 5 seconds
      soundService.playTick();
    }
  }, [gameState.timeLeft, gameState.status, activeMatch, currentUser, isVictoryAnimating, loadProfile]);

  useEffect(() => {
    if (!currentUser) return;

    // CHECK FOR PENDING INVITES ON LOAD
    matchService.getPendingInvitesForUser(currentUser.id).then(invites => {
      if (invites.length > 0) {
        invites.forEach(inv => {
          const modeLabel = inv.mode ? inv.mode.toUpperCase().replace('_', ' ') : 'DUEL';
          showToast(`⚔️ Invito per ${modeLabel} da ${inv.player1?.username || 'Sconosciuto'}!`, [
            {
              label: 'Accetta',
              onClick: () => {
                setPendingMatchInvite(inv.id);
              },
              variant: 'primary'
            },
            {
              label: 'Rifiuta',
              onClick: async () => {
                await matchService.declineInvite(inv.id, currentUser.id).catch(() => { });
                showToast("Invito rifiutato.");
              },
              variant: 'secondary'
            }
          ]);
        });
      }
    }).catch(() => { });
  }, [currentUser, showToast]);

  // 4. URL DEEP LINKING (Invitation Handling)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const joinId = params.get('joinMatch');
    if (joinId) {
      console.log("🔗 Detected Match Invite Link:", joinId);
      setPendingMatchInvite(joinId);
      // Clean URL
      const newUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // 5. AUTO-JOIN PENDING INVITE
  useEffect(() => {
    if (currentUser && pendingMatchInvite && !isJoiningPending) {
      const autoJoin = async () => {
        setIsJoiningPending(true);
        showToast("Accesso alla sfida in corso...");
        try {
          const match = await matchService.getMatchById(pendingMatchInvite);
          if (!match) {
            showToast("Sfida scaduta o non trovata.");
          } else if (match.status === 'finished' || match.status === 'cancelled') {
            showToast("La sfida è già terminata o è stata annullata.");
          } else {
            // Check if I am already in the match or need to join
            const isP1 = match.player1_id === currentUser.id;
            const isP2 = match.player2_id === currentUser.id;

            if (isP1 || isP2) {
              // I'm part of it, just activate
              if (match.status === 'invite_pending' && isP2) {
                await matchService.acceptInvite(match.id, currentUser.id);
              }
            } else if (!match.player2_id) {
              // Joinable public or invite without player2
              await matchService.joinMatch(match.id, currentUser.id);
            } else {
              showToast("La sfida è già al completo.");
              setIsJoiningPending(false);
              setPendingMatchInvite(null);
              return;
            }

            // Start the game logic (onMatchStart copy)
            setActiveModal(null);
            setDuelMode(match.mode as any);
            setActiveMatch({
              id: match.id,
              opponentId: match.player1_id === currentUser.id ? match.player2_id! : match.player1_id,
              isDuel: true,
              isP1: match.player1_id === currentUser.id,
              mode: match.mode // Capture mode explicitly
            });

            setGameState(prev => ({
              ...prev,
              score: 0,
              streak: 0,
              level: 1,
              timeLeft: match.mode === 'time_attack' ? 60 : INITIAL_TIME,
              status: 'playing',
              levelTargets: [],
            }));
            generateGrid(1, match.grid_seed);
            setOpponentScore(0);
            matchService.resetRoundStatus(match.id);
            soundService.playSuccess();
          }
        } catch (e: any) {
          if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
            console.error("Auto-join error:", e);
            showToast("Impossibile caricare la sfida.");
          }
        } finally {
          setIsJoiningPending(false);
          setPendingMatchInvite(null);
        }
      };
      autoJoin();
    } else if (!currentUser && pendingMatchInvite && !showAuthModal) {
      // Prompt for login if someone followed a link but isn't logged in
      setShowAuthModal(true);
      showToast("Accedi per accettare la sfida!");
    }
  }, [currentUser, pendingMatchInvite, isJoiningPending, showAuthModal, generateGrid, showToast]);


  const togglePause = async (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    await handleUserInteraction();
    soundService.playUIClick();

    if (!isPaused) {
      if (pauseLocked) {
        showToast("Sistema in riscaldamento... Attesa 3s");
        return;
      }
      setIsPaused(true);
    } else {
      setIsPaused(false);
      setPauseLocked(true);
      setTimeout(() => setPauseLocked(false), 3000);
    }
  };

  // Fetch Leaderboard Data on Open
  useEffect(() => {
    if (activeModal === 'leaderboard') {
      const fetchLeaderboard = async () => {
        const data = await leaderboardService.getTopPlayers(10);
        if (data) {
          setLeaderboardData(data as any);
        }
      };
      fetchLeaderboard();
    }
  }, [activeModal]);

  // Timer: Dedicated Loop for decrementing time only
  useEffect(() => {
    // MODIFIED: Timer disabled for Standard, ENABLED for Time Attack AND Blitz
    const isTimeDuel = activeMatch?.mode === 'time_attack' || activeMatch?.mode === 'blitz';
    // ADDED: !showGameTutorial blocks timer during tutorial
    if (gameState.status === 'playing' && gameState.timeLeft > 0 && !isVictoryAnimating && !showVideo && !isPaused && !showGameTutorial && (!activeMatch?.isDuel || isTimeDuel)) {
      timerRef.current = window.setInterval(() => {
        setGameState(prev => {
          if (prev.timeLeft <= 0) return prev;
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    } else {
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [gameState.status, isPaused, isVictoryAnimating, showVideo, activeMatch, gameState.timeLeft, showGameTutorial]);


  const handleLoginSuccess = (user: any) => {
    setCurrentUser(user);
    loadProfile(user.id);
    setShowAuthModal(false);
    showToast(`Benvenuto, ${user.user_metadata?.username || 'Operatore'}`);
  };

  const toggleMute = async (e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleUserInteraction();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundService.setMuted(newMuted);
    if (!newMuted) soundService.playUIClick();
  };

  const goToHome = async (e?: React.PointerEvent) => {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
    }
    await handleUserInteraction();
    soundService.playReset();

    // SFIDA LOGIC (ABBANDONO)
    if (activeMatch && currentUser && latestMatchData?.status !== 'finished') {
      const targetToWin = duelMode === 'blitz' ? 3 : 5;
      const someoneWon = latestMatchData?.winner_id ||
        (latestMatchData?.p1_rounds >= targetToWin) ||
        (latestMatchData?.p2_rounds >= targetToWin);

      if (!someoneWon) {
        // Se esco durante un duello ATTIVO, dichiaro l'avversario vincitore (Abbandono)
        matchService.sendAbandonment(activeMatch.id, currentUser.id).catch(() => { });
        matchService.declareWinner(activeMatch.id, activeMatch.opponentId).catch(() => { });
        showToast("Sfida abbandonata.");
      }
    }

    setGameState(prev => ({
      ...prev,
      status: 'idle',
      isBossLevel: false,
      bossLevelId: null
    }));
    setActiveModal(null);
    setActiveMatch(null);
    setShowDuelRecap(false);
    setShowVideo(false);
    setShowLostVideo(false);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setSelectedPath([]);
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (currentUser) loadProfile(currentUser.id);
  };

  const goToDuelLobby = async () => {
    soundService.playReset();
    setGameState(prev => ({ ...prev, status: 'idle' }));
    setActiveModal('duel_selection'); // Torna alla lobby dei duelli
    setActiveMatch(null);
    setShowDuelRecap(false);
    setShowVideo(false);
    setShowLostVideo(false);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setSelectedPath([]);
    if (timerRef.current) window.clearInterval(timerRef.current);
  };

  const handleQuickInvite = async () => {
    if (!currentUser) {
      showToast("Accedi per invitare un amico!");
      setShowAuthModal(true);
      return;
    }

    soundService.playUIClick();
    const mode = 'standard';
    const seed = Math.random().toString(36).substring(7);

    try {
      const newMatch = await matchService.createMatch(currentUser.id, seed, mode);
      if (newMatch) {
        setDuelMode(mode);
        const joinUrl = `${window.location.origin}${window.location.pathname}?joinMatch=${newMatch.id}`;
        const text = `Ti sfido a Neural Duel! 🧠⚔️\nClicca qui per accettare la sfida: ${joinUrl}`;

        if (navigator.share) {
          try {
            await navigator.share({ title: "Sfida a Neural Duel!", text, url: joinUrl });
          } catch (err) {
            console.log('Share dismissed', err);
          }
        } else {
          try {
            await navigator.clipboard.writeText(text);
            showToast("Link sfida copiato!");
          } catch (err) {
            showToast("Impossibile copiare il link.");
          }
        }
        // Staying home after invite as requested
      }
    } catch (e: any) {
      showToast(e.message || "Errore creazione invito");
    }
  };


  const handleDuelRoundStart = (matchData: any) => {
    // Close Modal
    setShowDuelRecap(false);
    setGameState(prev => ({
      ...prev,
      levelTargets: [],
      score: 0, // Reset score (targets found) for new round
      // FORCE 60s for Time Attack when round actually starts
      timeLeft: (matchData.mode === 'time_attack') ? 60 : INITIAL_TIME,
      status: 'playing'
    }));

    if (activeMatch?.isDuel) {
      // Deterministic seed based on match ID and total rounds played
      // This ensures both players get the same board for each round
      const roundSum = (matchData.p1_rounds || 0) + (matchData.p2_rounds || 0);
      const deterministicSeed = `${matchData.id}_round_${roundSum}`;
      generateGrid(1, deterministicSeed);
    } else {
      generateGrid(gameState.level);
    }

    if (currentUser?.id === matchData.player1_id) {
      matchService.resetRoundStatus(matchData.id);
    }
    soundService.playReset();
  };

  // Wrapper for calculation using paths (IDs) instead of Cells
  const calculateResultFromPath = (pathIds: string[]): number | null => {
    const cells = pathIds.map(id => grid.find(c => c.id === id)).filter(Boolean) as HexCellData[];
    return calculateResultFromCells(cells);
  };

  // DUEL: Subscribe to Match Updates (Score, Rounds, Winner, READY STATUS)
  useEffect(() => {
    if (activeMatch?.id && activeMatch.isDuel) {
      const sub = matchService.subscribeToMatch(activeMatch.id, (payload: any) => {
        const newData = payload.new;
        if (!newData) return;

        setLatestMatchData((prev: any) => {
          if (prev?.id === newData.id && prev.status === 'finished' && newData.status !== 'finished') {
            return { ...newData, status: 'finished', winner_id: prev.winner_id };
          }
          return newData;
        });

        const amIP1 = newData.player1_id === currentUser?.id;

        // Ensure Active Match has critical data (Mode) for Host Timer
        if (activeMatch && (!activeMatch.mode || activeMatch.mode !== newData.mode)) {
          setActiveMatch(prev => prev ? { ...prev, isP1: amIP1, mode: newData.mode } : null);
          setDuelMode(newData.mode as any); // Force Sync Local Mode
        } else if (activeMatch && activeMatch.isP1 !== amIP1) {
          setActiveMatch(prev => prev ? { ...prev, isP1: amIP1 } : null);
        }

        // TIME ATTACK SYNC START
        // If match becomes ACTIVE and it's Time Attack, start immediately if not playing
        // AND ensuring we haven't already finished this match locally (prevent loop)
        if (newData.status === 'active' &&
          (newData.mode === 'time_attack' || activeMatch?.mode === 'time_attack') &&
          gameStateRef.current.status !== 'playing' &&
          processedWinRef.current !== newData.id) {
          console.log("⚡ Time Attack START SYNC");
          startGame(1); // Force start
        }

        if (newData.p1_ready && newData.p2_ready && showDuelRecap && newData.status !== 'finished') {
          handleDuelRoundStart(newData);
        }

        const currentMode = newData.mode || activeMatch?.mode || 'standard';
        const currentP1Rounds = newData.p1_rounds || 0;
        const currentP2Rounds = newData.p2_rounds || 0;
        const totalRoundsWon = currentP1Rounds + currentP2Rounds;

        // TRACK ROUND CHANGES (Blitz Mode Auto-Reset)
        // Use Ref to avoid stale closure issues in subscription
        const localRounds = duelRoundsRef.current;
        const localTotal = localRounds.p1 + localRounds.p2;

        // Detect if DB has advanced beyond our local state
        // Detect if DB has advanced beyond our local state
        // DOMINION / BLITZ SIGNAL INTERCEPTOR
        // We use 'current_round' to signal Stolen Targets (+Value = P1, -Value = P2)
        // We check if the signal is different from what we last processed.
        const signal = newData.current_round || 0;
        const lastSignal = localRounds.current || 0;

        if (currentMode === 'blitz' && newData.status === 'active' && signal !== 0 && signal !== lastSignal) {
          const stolenValue = Math.abs(signal);
          const newOwner = signal > 0 ? 'p1' : 'p2';
          const imOwner = (amIP1 && newOwner === 'p1') || (!amIP1 && newOwner === 'p2');

          console.log(`🏴 DOMINION SIGNAL: Target ${stolenValue} captured by ${newOwner}`);

          // Update UI Targets
          setGameState(prev => {
            const updated = prev.levelTargets.map(t => {
              if (t.value === stolenValue) {
                return { ...t, completed: true, owner: newOwner };
              }
              // PING PONG SCORING: 
              // We update the owner. The scores are updated via the standard 'newData.playerX_score' update below.
              // But we must visually update the owner immediately for the "Green/Red" feedback.
              if (t.value === stolenValue) {
                return { ...t, completed: true, owner: newOwner };
              }

              // CRITICAL: If I owned it, and now newOwner is NOT me, I lost it.
              // The 'owner' property on the target is the source of truth for color.
              return t;
            });
            return { ...prev, levelTargets: updated };
          });

          // Toast for Enemy Action
          // Toast for Enemy Action - DISABLED for Blitz Dominion (Too spammy)
          if (!imOwner && currentMode !== 'blitz') {
            showToast(`L'AVVERSARIO HA RUBATO IL ${stolenValue}!`, [], 2000);
            soundService.playError(); // Alert sound
          }

          // Update REF to avoid re-processing same signal
          duelRoundsRef.current = {
            ...duelRoundsRef.current,
            current: signal
          };
        }

        // REMOVED OLD BLITZ ROUND LOGIC (Previously lines 984-1082)


        const opScore = amIP1 ? newData.player2_score : newData.player1_score;
        const opRounds = amIP1 ? newData.p2_rounds : newData.p1_rounds;

        setOpponentScore(opScore);
        // In Blitz Dominion, targets = opScore (targets owned), in Standard targets = opRounds (total targets)
        setOpponentTargets(currentMode === 'blitz' ? opRounds : opRounds);

        setDuelRounds({
          p1: currentP1Rounds,
          p2: currentP2Rounds,
          current: newData.current_round || 1
        });

        // Use new values for loss check
        const opponentRoundWins = amIP1 ? currentP2Rounds : currentP1Rounds;

        // LOSS DETECTION
        const isStandardLoss = currentMode === 'standard' && opRounds >= 5;
        // Blitz loss disabled
        // const isBlitzLoss = currentMode === 'blitz' && opponentRoundWins >= 3;

        if (newData.status === 'finished') {
          // Ensure processedWinRef blocks duplicate execution but allow UI cleanup
          // Check if I am the loser
          if (newData.winner_id !== currentUser?.id && processedWinRef.current !== newData.id) {
            console.log("🏁 MATCH FINISHED: I am the LOSER. Playing Defeat Sequence.");
            processedWinRef.current = newData.id;

            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));
            setIsDragging(false);
            setSelectedPath([]);

            if (videoRef.current) {
              const loseVid = LOSE_VIDEOS[Math.floor(Math.random() * LOSE_VIDEOS.length)];
              setLoseVideoSrc(loseVid);
              setShowLostVideo(true);
              setIsVideoVisible(true);

              videoRef.current.src = loseVid;
              videoRef.current.muted = false;
              videoRef.current.load();
              videoRef.current.play().catch(e => console.warn("Loss video blocked:", e));
            }
          } else if (gameStateRef.current.status === 'playing') {
            // Just force exit if I was playing (e.g. Winner who hasn't transitioned yet? Winner usually handles it in handleSuccess)
            // But usually Winner sets 'finished' in handleSuccess.
            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));
          }
        }


        // ADDITIONAL CHECK: Handle CANCELLED explicitly (Surrender/Abandon)
        if (newData.status === 'cancelled') {
          console.log("⚡ Realtime: Match Cancelled (Opponent Surrendered)");
          if (timerRef.current) window.clearInterval(timerRef.current);
          setGameState(prev => ({ ...prev, status: 'idle' }));

          // Trigger Surrender Win Flow
          const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
          setSurrenderVideoSrc(randomSurrender);
          setShowSurrenderVideo(true);
          setIsVideoVisible(false);
          if (videoRef.current) {
            videoRef.current.muted = false;
            videoRef.current.src = randomSurrender;
            videoRef.current.play().catch(e => {
              console.warn("Surrender video blocked:", e);
              setIsVideoVisible(false);
            });
          }
        }
      });

      if (latestMatchData?.id === activeMatch.id && latestMatchData?.status === 'finished' && gameStateRef.current.status === 'playing') {
        const amIWinner = latestMatchData.winner_id === currentUser?.id;

        // Prevent duplicate handling if we already processed this win locally
        if (amIWinner && processedWinRef.current === latestMatchData.id) return;

        if (!amIWinner) {
          // Play Defeat Video
          if (videoRef.current) {
            const loseVid = LOSE_VIDEOS[0];
            videoRef.current.src = loseVid;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("Duel loss video blocked:", e));

            soundService.playLose();
            setLoseVideoSrc(loseVid);
            setShowLostVideo(true);
            setIsVideoVisible(true);
          }
        }

        setGameState(prev => ({ ...prev, status: 'idle' }));
        setIsDragging(false);
        setSelectedPath([]);

        // Delay Recap controlled by video end
        if (!amIWinner && !videoRef.current) {
          // Fallback if no video plays
          setShowDuelRecap(true);
        } else if (amIWinner && !videoRef.current) {
          // If I won but no video (rare), show recap
          setShowDuelRecap(true);
        }
      }

      return () => {
        if (sub) (supabase as any).removeChannel(sub);
      };
    }
  }, [activeMatch, currentUser, showDuelRecap, latestMatchData]);

  // BLITZ ROUND TRANSITION EFFECT
  // BLITZ ROUND TRANSITION EFFECT REMOVED (Legacy Round Logic)

  // MATCH BROADCAST LOGIC (Abandonment)
  useEffect(() => {
    if (activeMatch?.id) {
      const channel = matchService.subscribeToMatchEvents(activeMatch.id, (event, payload) => {
        if (event === 'match_abandoned' && payload.fromUserId !== currentUser?.id) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setGameState(prev => ({ ...prev, status: 'idle' })); // Temporarily idle before recap

          // SURRENDER FLOW:
          // 1. Random Video
          const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
          setSurrenderVideoSrc(randomSurrender);
          setShowSurrenderVideo(true);
          setIsVideoVisible(false);

          if (videoRef.current) {
            videoRef.current.muted = true; // Video has no audio
            videoRef.current.src = randomSurrender;
            videoRef.current.play().catch(e => {
              console.warn("Surrender (abandon) video blocked:", e);
              setIsVideoVisible(false);
            });
            // Play Surrender Audio
            soundService.playExternalSound('Resa1.mp3');
          }

          // 2. Add Points (Optional logic, using current score)
          // The recap will show current score + bonus if handled there.
        }
      });
      return () => { if (channel) (supabase as any).removeChannel(channel); };
    }
  }, [activeMatch, currentUser]);

  /* 
  // SYNC WATCHDOG (Fallback for missed events) - DISABLED temporarily as requested
  useEffect(() => {
    let syncInterval: NodeJS.Timeout;

    if (activeMatch?.id && gameStateRef.current.status === 'playing') {
      syncInterval = setInterval(async () => {
        const status = await matchService.verifyMatchStatus(activeMatch.id);

        // SAFETY CHECK: If transient error, skip this cycle
        if (status && status.status === 'ERROR') return;

        const isMatchGone = status === null;
        const isCancelled = status && status.status === 'cancelled';
        const isFinished = status && status.status === 'finished';

        // CASE 1: SURRENDER / ABNORMAL END
        // Match deleted or explicitly cancelled -> Force Surrender Win
        if (isMatchGone || isCancelled) {
          if (gameStateRef.current.status === 'playing') {
            console.warn("SYNC WATCHDOG: Match abandoned/missing. Triggering Surrender Win.");
            if (timerRef.current) window.clearInterval(timerRef.current);
            setGameState(prev => ({ ...prev, status: 'idle' }));

            const randomSurrender = SURRENDER_VIDEOS[Math.floor(Math.random() * SURRENDER_VIDEOS.length)];
            setSurrenderVideoSrc(randomSurrender);
            setShowSurrenderVideo(true);
            setIsVideoVisible(false);

            if (videoRef.current) {
              videoRef.current.muted = false;
              videoRef.current.src = randomSurrender;
              videoRef.current.play().catch(e => {
                console.warn("Surrender (watchdog) video blocked:", e);
                setIsVideoVisible(false);
              });
            }
          }
        }
        // CASE 2: NORMAL END (SYNC LAG)
        // Match finished but I am still playing -> Force Normal End
        else if (isFinished) {
          if (gameStateRef.current.status === 'playing') {
            console.log("SYNC WATCHDOG: Match finished normally. Syncing state.");
            if (timerRef.current) window.clearInterval(timerRef.current);

            // Determine if I won or lost based on DB
            const amIWinner = status.winner_id === currentUser?.id;

            // If I lost, show Lost Sound/Flow. If I won, handle Win.
            // Since we are lagging, easiest is to go to idle and let DuelRecap component show result.
            setGameState(prev => ({ ...prev, status: 'idle' }));
            if (!amIWinner) soundService.playExternalSound('lost.mp3');
            setShowDuelRecap(true);
          }
        }
      }, 3000); // Check every 3 seconds
    }

    return () => {
      if (syncInterval) clearInterval(syncInterval);
    };
  }, [activeMatch, currentUser, gameState.status]);
  */

  // NEW: Invite Listener (Global) - Properly placed after generateGrid
  useEffect(() => {
    if (!currentUser) return;

    const channel = (supabase as any).channel('invite-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'matches',
          filter: `player2_id=eq.${currentUser.id}`,
        },
        async (payload: any) => {
          if (payload.new.status === 'invite_pending') {
            soundService.playSuccess(); // Notification sound

            showToast(`⚔️ SFIDA! Un giocatore ti ha invitato a ${payload.new.mode}.`, [
              {
                label: 'ACCETTA',
                onClick: async () => {
                  const success = await matchService.acceptInvite(payload.new.id, currentUser.id);
                  if (success) {
                    // Initialize Game
                    const seed = payload.new.grid_seed;
                    const mode = payload.new.mode;

                    setActiveMatch({ id: payload.new.id, opponentId: payload.new.player1_id, isDuel: true, isP1: false, mode: mode });
                    setDuelMode(mode);

                    // Reset Game State for Duel
                    soundService.playUIClick();
                    setGameState(prev => ({
                      ...prev,
                      score: 0,
                      totalScore: prev.totalScore,
                      streak: 0,
                      level: 1,
                      timeLeft: mode === 'time_attack' ? 60 : INITIAL_TIME,
                      targetResult: 0,
                      status: 'playing',
                      lastLevelPerfect: true,
                      basePoints: BASE_POINTS_START,
                      levelTargets: [],
                    }));

                    generateGrid(1, seed);
                    setOpponentScore(0);
                    matchService.resetRoundStatus(payload.new.id);

                    // If any modal is open, close it
                    setActiveModal(null);
                  }
                }
              },
              {
                label: 'RIFIUTA',
                onClick: async () => {
                  await matchService.abandonMatch(payload.new.id, currentUser.id);
                  showToast("Invito rifiutato.");
                }
              }
            ]);
          }
        }
      )
      .subscribe();

    return () => { (supabase as any).removeChannel(channel); };
  }, [currentUser, showToast, generateGrid]);


  const startGame = async (startLevel: number = 1) => {
    await handleUserInteraction();
    soundService.playUIClick();
    try {
      localStorage.setItem('number_tutorial_done', 'true');
    } catch (e) { console.warn("LocalStorage blocked", e); }

    setActiveModal(null);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);
    setShowVideo(false);
    setShowLostVideo(false);
    setShowDuelRecap(false);

    // FIXED: Session score (totalScore) now always starts at 0 for Single Player sittings
    // to ensure a clean local run, while all-time points are safely kept in the global profile.
    const careerBonus = parseInt(localStorage.getItem('career_time_bonus') || '0');
    // Consume bonus if starting a standard game
    if (careerBonus > 0 && !activeMatch?.isDuel) {
      localStorage.setItem('career_time_bonus', '0');
      // Show toast notification
      showToast(`🏆 BONUS BOSS ATTIVATO! +${careerBonus}s al tempo iniziale!`);
    }

    setGameState(prev => {
      let nextTotalScore = prev.totalScore;

      if (!activeMatch?.isDuel) {
        // Single Player Logic: Every sitting starts at 0.
        // It will accumulate points across levels (via nextLevel) as long as the session continues.
        nextTotalScore = 0;
      }

      return {
        ...prev,
        score: 0,
        totalScore: nextTotalScore,
        streak: 0,
        level: startLevel,
        timeLeft: (activeMatch?.mode === 'time_attack') ? 60 : INITIAL_TIME + careerBonus,
        targetResult: 0,
        status: 'playing',
        estimatedIQ: startLevel === 1 ? 100 : prev.estimatedIQ,
        lastLevelPerfect: true,
        basePoints: BASE_POINTS_START,
        levelTargets: [],
        isBossLevel: false,
        bossLevelId: null,
      };
    });

    // Reset Buffer and Grid with explicit Level
    setTimeout(() => generateGrid(startLevel), 0);

    // Clear and re-save initial state for session
    if (currentUser && !activeMatch?.isDuel) {
      const initialSaveState = {
        totalScore: startLevel === 1 ? 0 : (savedGame?.totalScore || 0),
        streak: 0,
        level: startLevel,
        timeLeft: (activeMatch?.mode === 'time_attack') ? 60 : INITIAL_TIME,
        estimatedIQ: startLevel === 1 ? 100 : (userProfile?.estimated_iq || 100)
      };

      profileService.saveGameState(currentUser.id, initialSaveState)
        .catch(e => {
          if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
            console.error("Error saving initial game state:", e);
          }
        });
      setSavedGame(initialSaveState);
    }
  };

  const restoreGame = async () => {
    if (!savedGame) return;
    await handleUserInteraction();
    soundService.playSuccess(); // Different sound for restore?

    setActiveModal(null);
    setIsVictoryAnimating(false);
    setTriggerParticles(false);
    setPreviewResult(null);

    // Check for Career Bonus
    const careerBonus = parseInt(localStorage.getItem('career_time_bonus') || '0');
    let newTimeLeft = savedGame.timeLeft || INITIAL_TIME;

    if (careerBonus > 0) {
      localStorage.setItem('career_time_bonus', '0');
      newTimeLeft += careerBonus;
      showToast(`🏆 BONUS BOSS ATTIVATO! +${careerBonus}s al tempo ripristinato!`);
    }

    setGameState(prev => ({
      ...prev, // Keep some defaults
      score: 0,
      totalScore: 0, // Reset session score to 0 on restore
      streak: savedGame.streak || 0,
      level: savedGame.level || 1,
      timeLeft: newTimeLeft,
      status: 'playing',
      estimatedIQ: savedGame.estimatedIQ || 100,
      levelTargets: [],
    }));

    // Generate Grid for the SAVED Level
    setTimeout(() => generateGrid(savedGame.level), 0);
  };



  // FULL GAME RESET: Ora agisce come "NUOVA PARTITA" (soft reset)
  // Resetta Livello a 1, ma mantiene Badge, Boss e Statistiche totali.
  const handleFullReset = async () => {
    if (!currentUser) return;

    try {
      // 1. Cancella la partita salvata (resume state)
      await profileService.saveGameState(currentUser.id, null);
      setSavedGame(null);
      localStorage.setItem('career_time_bonus', '0'); // Clear any local bonus

      // 2. Reset solo del livello nel profilo (mantiene badge, score totale, ecc.)
      await profileService.updateProfile({
        id: currentUser.id,
        max_level: 1,
      });

      // 3. Ricarica profilo aggiornato
      await loadProfile(currentUser.id);

      // 4. Reset stato gioco locale
      setGameState({
        ...gameState,
        score: 0,
        // totalScore: 0, // Manteniamo il punteggio totale accumulato? Se vuoi reset parziale, meglio tenerlo o resettarlo? 
        // L'utente ha chiesto "azzeriamo livelli e tempo come pulsante nuova partita".
        // La mia handleNewGame di prima metteva totalScore a 0 LATO CLIENT per la sessione, ma non toccava il DB.
        totalScore: 0, // Reset visuale sessione
        streak: 0,
        level: 1,
        timeLeft: INITIAL_TIME,
        targetResult: 0,
        status: 'idle',
        estimatedIQ: 100, // Manteniamo o reset? HandleNewGame lo teneva. Mettiamo default visuale.
        lastLevelPerfect: true,
        basePoints: BASE_POINTS_START,
        levelTargets: [],
        isBossLevel: false,
        bossLevelId: null,
      });

      setActiveModal(null);
      soundService.playSuccess();
      showToast('🎮 PARTITA RIAVVIATA! Si riparte dal Livello 1');

    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error('Errore durante il reset:', error);
        showToast('❌ Errore durante il riavvio. Riprova.');
      }
    }
  };

  const handleStartGameClick = useCallback(async (e?: React.PointerEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    await handleUserInteraction();

    // Clear any leftover duel state when starting single player
    if (activeMatch) setActiveMatch(null);

    // Always show briefing modal before starting
    setActiveModal('resume_confirm');
    return;

    // New Comic Tutorial Check
    if (localStorage.getItem('comic_game_tutorial_done') !== 'true') {
      startGame(); // Start the game first so elements exist
      setTimeout(() => setShowGameTutorial(true), 1000); // Delay to let animation finish
    } else {
      startGame();
    }
  }, [savedGame, startGame, handleUserInteraction]);

  const nextTutorialStep = async () => {
    await handleUserInteraction();
    soundService.playSelect();
    if (tutorialStep < TUTORIAL_STEPS.length - 1) {
      setTutorialStep(prev => prev + 1);
    } else {
      // Tutorial Finished - Just close and stay on Home
      setActiveModal(null);
      localStorage.setItem('number_tutorial_done', 'true');
      // If we are not playing, ensure we are visible in idle
      if (gameState.status !== 'playing') {
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }
    }
  };

  const evaluatePath = (pathIds: string[]) => {
    try {
      if (pathIds.length < 3) {
        if (pathIds.length > 0) soundService.playReset();
        setSelectedPath([]);
        setPreviewResult(null);
        return;
      }

      const result = calculateResultFromPath(pathIds);
      // USE REF TO ENSURE FRESHNESS (Fixes First Target Glitch)
      const currentTargets = gameStateRef.current.levelTargets || [];
      // BLITZ DOMINION FIX: Allow selecting 'completed' targets to steal them back!
      const isBlitzDominion = activeMatch?.mode === 'blitz' || duelMode === 'blitz';

      let matchedTarget;

      if (gameState.isBossLevel) {
        // BOSS MODE STRICT SEQUENTIAL LOGIC
        // Only the FIRST uncompleted target is valid. Any other uncompleted target is ignored.
        const activeTarget = currentTargets.find(t => !t.completed);
        if (activeTarget && activeTarget.value === result) {
          matchedTarget = activeTarget;
        } else {
          matchedTarget = undefined;
        }
      } else {
        // STANDARD MODE LOGIC (Any uncompleted target is valid)
        matchedTarget = currentTargets.find(t => t.value === result && (!t.completed || isBlitzDominion));
      }

      if (matchedTarget) {
        // SYNC VIDEO TRIGGER FOR MOBILE - Call play() directly in user gesture stack
        const isLastTarget = currentTargets.filter(t => !t.completed).length === 1;
        const isTimeAttack = !!activeMatch && (activeMatch.mode === 'time_attack' || duelMode === 'time_attack');

        // CRITICAL MOBILE FIX: Set source and play synchronously within the event handler
        if (isLastTarget && !isTimeAttack && !isBlitzDominion && videoRef.current) {
          // 1. Play "Fine Partita" sound immediately on last click
          soundService.playLevelComplete();

          // 2. Delay the Victory Video (Win1/Win2) to let the first sound play
          setTimeout(() => {
            if (videoRef.current) {

              if (gameState.bossLevelId === 1) {
                // BOSS LEVEL 1 WIN SEQUENCE
                const vidSrc = '/Bonus30secondiboss.mp4';
                videoRef.current.src = vidSrc;
                videoRef.current.muted = true;
                videoRef.current.load();
                videoRef.current.play().catch(e => console.warn("Boss Bonus video blocked:", e));

                setIsBossBonusPlaying(true);
                soundService.playBossBonus(); // Specific Boss Audio

                setWinVideoSrc(vidSrc);
                setShowVideo(true);
                setIsVideoVisible(true);
              } else {
                // STANDARD LEVEL WIN
                const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                const vidSrc = WIN_VIDEOS[winIdx];

                videoRef.current.src = vidSrc;
                videoRef.current.muted = true; // Still muted for browser policy, user un-mutes
                videoRef.current.load();

                // Play Sync Win Audio (matching the video) instead of relying on video track
                soundService.playWinner(winIdx);

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(error => {
                    console.warn("Video play blocked by browser policy:", error);
                    // Fallback: If video blocked, at least we heard the audio
                  });
                }

                setWinVideoSrc(vidSrc);
                setShowVideo(true);
                setIsVideoVisible(true);
              }
            }
          }, 800); // 0.8 second delay
        }

        handleSuccess(result!);
        setSelectedPath([]);
      } else {
        handleError();
      }
      setPreviewResult(null);
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('signal is aborted without reason')) {
        console.error("Critical error in evaluatePath:", err);
      }
      // Prevent crash, reset selection
      setSelectedPath([]);
    }
  };

  const handleSuccess = async (matchedValue: number) => {
    try {
      console.log("🎯 SUCCESS: Target Found:", matchedValue);
      // RACE CONDITION FIX: Do not process win if game is already over
      if (gameStateRef.current.status !== 'playing') return;

      soundService.playSuccess();

      // SCORED POINTS
      const basePoints = 10;
      const streakBonus = gameStateRef.current.streak * 1;
      const currentPoints = basePoints + streakBonus;
      const newScore = gameStateRef.current.score + currentPoints;

      // Update targets state
      const currentTargets = gameStateRef.current.levelTargets;
      const isBlitzDominion = activeMatch?.mode === 'blitz' || duelMode === 'blitz';

      // BLITZ DOMINION FIX: Allow finding completed targets too
      const targetIndex = currentTargets.findIndex(t => t.value === matchedValue && (!t.completed || isBlitzDominion));

      if (targetIndex === -1) {
        console.warn("⚠️ Target already completed or not found:", matchedValue);
        return;
      }

      const newTargets = [...currentTargets];
      // Mark as completed. In Dominion, the 'owner' update (later) is what really counts.
      newTargets[targetIndex] = { ...newTargets[targetIndex], completed: true };

      // Update Local Game State right away for UI feedback
      setGameState(prev => ({
        ...prev,
        score: newScore,
        totalScore: prev.totalScore + currentPoints,
        streak: prev.streak + 1,
        estimatedIQ: Math.min(200, prev.estimatedIQ + 0.5),
        levelTargets: newTargets
      }));

      // DEFINISCI COSTANTI (Winning bonuses)
      const finalTimeBonus = Math.floor(gameStateRef.current.timeLeft * 1.5);
      const finalVictoryBonus = 50;
      const totalWinBonuses = finalTimeBonus + finalVictoryBonus;
      const finalPointsToSync = newScore + totalWinBonuses;

      setScoreAnimKey(k => k + 1);

      const isTimeAttack = !!activeMatch && (duelMode === 'time_attack' || activeMatch.mode === 'time_attack');
      // For Time Attack, we don't care about 'allDone' in the traditional sense, targets regenerate
      const localTargetsFound = newTargets.filter(t => t.completed).length;
      const allDone = newTargets.every(t => t.completed) && !isTimeAttack;

      // TIME ATTACK: REGENERATE TARGET AFTER 5 SECONDS
      if (isTimeAttack) {
        // Sync Score Immediately
        matchService.updateScore(activeMatch.id, currentUser.id, newScore, activeMatch.isP1)
          .catch(e => {
            if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
              console.error("TA Score Sync Error", e);
            }
          });

        setTimeout(() => {
          // Check if game is still playing
          if (gameStateRef.current.status !== 'playing') return;

          const currentTargetsRef = gameStateRef.current.levelTargets;
          // Find the finished target index (safe lookup)
          // We rely on the fact that we just completed 'matchedValue'. 
          // But multiple instances of same value? We find the first completed one that matches or index.
          // Better: just replace the specific index we touched 'targetIndex'.

          if (targetIndex >= 0 && targetIndex < currentTargetsRef.length) {
            // Generate new Random Target Logic
            const lvl = gameStateRef.current.level; // Use current level data
            // Approximate range based on level (same as createLevelData logic roughly)
            const min = 1 + (lvl * 2);
            const max = 20 + (lvl * 5);
            const newTargetValue = Math.floor(Math.random() * (max - min + 1)) + min;

            // Functional State Update
            setGameState(prev => {
              const updatedTargets = [...prev.levelTargets];
              updatedTargets[targetIndex] = { value: newTargetValue, completed: false };
              return { ...prev, levelTargets: updatedTargets };
            });
          }
        }, 5000); // 5 Seconds delay (As requested)
      }

      if (activeMatch?.isDuel && duelMode === 'blitz') {
        const isP1 = activeMatch.isP1;

        // DOMINION LOGIC: Steal the target!
        const signalValue = matchedValue; // The number itself

        // Check if the target was owned by the opponent
        const targetObj = gameState.levelTargets.find(t => t.value === matchedValue);
        const wasEnemyOwned = targetObj?.owner && ((isP1 && targetObj.owner === 'p2') || (!isP1 && targetObj.owner === 'p1'));

        // Calculate New Scores
        let myCurrentCount = isP1 ? duelRounds.p1 : duelRounds.p2;
        let opCurrentCount = isP1 ? duelRounds.p2 : duelRounds.p1;

        // If I didn't own it already, I gain a point
        if (targetObj?.owner !== (isP1 ? 'p1' : 'p2')) {
          myCurrentCount += 1;
        }

        // If the enemy owned it, they lose a point
        if (wasEnemyOwned) {
          opCurrentCount = Math.max(0, opCurrentCount - 1);
        }

        const myNewTargetCount = myCurrentCount;
        const opNewTargetCount = opCurrentCount;

        // Sync Points as well for Tie-Breaker
        // My Points: Calculated above (newScore) which includes 10 + streak
        const myPoints = newScore;
        // Opponent Points: We use what we have cached in 'opponentScore'.
        // This relies on 'opponentScore' being accurate (synced via subscription).
        const opPoints = opponentScore;

        await matchService.stealTarget(activeMatch.id, isP1, signalValue,
          isP1 ? myNewTargetCount : opNewTargetCount, // Targets P1
          isP1 ? opNewTargetCount : myNewTargetCount, // Targets P2
          isP1 ? myPoints : opPoints,                 // Points P1
          isP1 ? opPoints : myPoints                  // Points P2
        );

        // DOMINION TOAST REMOVED (Too spammy)

        // We do NOT declare winner here. Winner is declared only on Time Over.
      }



      if (allDone) {
        setTriggerParticles(false);
        if (!videoRef.current) soundService.playExternalSound('Fine_partita_win.mp3');

        // BOSS LEVEL WIN LOGIC
        if (gameState.isBossLevel) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          setIsVictoryAnimating(true);

          // Reward: +30s to career time bonus (Persistent via localStorage for now)
          // We don't stack it indefinitely, we set it to 30 for the next classic game
          localStorage.setItem('career_time_bonus', '30');

          // Sync score to global profile AND award boss completion
          if (currentUser) {
            const bossFinalPoints = newScore + 50; // Just Score + Victory Bonus, NO Time Left conversion

            // Award Boss Badge + Time Bonus AND Sync points sequentially
            profileService.completeBoss(currentUser.id, gameState.bossLevelId!)
              .then(isNewCompletion => {
                if (isNewCompletion) console.log('✅ Boss completion badge awarded!');
                // Chain syncProgress after boss completion
                return profileService.syncProgress(currentUser.id, bossFinalPoints, gameState.level, gameState.estimatedIQ);
              })
              .then(() => {
                console.log('✅ Boss progress and badge synced!');
                loadProfile(currentUser.id);
              })
              .catch(e => console.error("Error updating boss completion:", e));
          }

          // Boss 1 specific victory sequence
          if (gameState.bossLevelId === 1) {
            // Wait for UI to update (0.5s)
            setTimeout(() => {
              if (videoRef.current) {
                const vidSrc = '/Bonus30secondiboss.mp4';
                videoRef.current.src = vidSrc;
                // Important: Mobile browsers block autoplay with sound. Muted first.
                videoRef.current.muted = true;
                videoRef.current.load();

                const playPromise = videoRef.current.play();
                if (playPromise !== undefined) {
                  playPromise.catch(e => console.warn("Boss bonus video autoplay blocked:", e));
                }

                // Play audio separately if needed (soundService already handles BossBonus sound)
                setIsBossBonusPlaying(true);
                setWinVideoSrc(vidSrc);
                setShowVideo(true);
                setIsVideoVisible(true);
              }
            }, 500);
          } else {
            // Standard Boss Win
            setShowVideo(true);
          }

          return;
        }

        // DUEL WIN LOGIC
        if (activeMatch?.isDuel) {
          // STANDARD MODE - WIN CONDITION: 5 TARGETS (POINTS)
          // CRITICAL FIX: Ensure this NEVER runs for Blitz mode
          if (duelMode === 'standard') {
            const finalScore = newScore;
            matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, finalScore, localTargetsFound)
              .catch(e => console.error("Error syncing final duel stats:", e));

            if (localTargetsFound >= 5) {
              try {
                await matchService.declareWinner(activeMatch.id, currentUser.id);
                processedWinRef.current = activeMatch.id;

                // Optimistic Update
                setLatestMatchData(prev => ({
                  ...prev,
                  status: 'finished',
                  winner_id: currentUser!.id,
                  player1_score: activeMatch.isP1 ? finalScore : prev?.player1_score,
                  player2_score: !activeMatch.isP1 ? finalScore : prev?.player2_score,
                  p1_rounds: activeMatch.isP1 ? 5 : prev?.p1_rounds,
                  p2_rounds: !activeMatch.isP1 ? 5 : prev?.p2_rounds,
                  last_time_bonus: finalTimeBonus,
                  last_victory_bonus: finalVictoryBonus
                }));

                // SYNC GLOBAL SCORE: Match Points + Bonuses
                await profileService.syncProgress(currentUser.id, finalPointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ);
                await loadProfile(currentUser.id);

                soundService.playLevelComplete();

                setTimeout(() => {
                  if (videoRef.current) {
                    const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                    const vidSrc = WIN_VIDEOS[winIdx];
                    videoRef.current.src = vidSrc;
                    videoRef.current.muted = false;
                    videoRef.current.load();
                    videoRef.current.play().catch(e => console.warn("Duel win video blocked:", e));
                    soundService.playWinner(winIdx);
                    setWinVideoSrc(vidSrc);
                    setShowVideo(true);
                    setIsVideoVisible(true);
                  }
                }, 800);

              } catch (error: any) {
                if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
                  console.error("Error finishing duel safely:", error);
                }
                setGameState(prev => ({ ...prev, status: 'idle' }));
                setShowDuelRecap(true);
              }
              setSelectedPath([]);
              return;
            }
          }
          // BLITZ DOMINION LOGIC:
          // We intentionally do NOT trigger a win here.
          // Dominion mode ends strictly when the timer reaches zero (handled in handleTimeAttackEnd).
          // Finding all targets (if that were possible/relevant) doesn't end the game early in Dominion.
        }

        // STANDARD LEVEL WIN LOGIC (Single Player)
        if (timerRef.current) window.clearInterval(timerRef.current);
        setIsVictoryAnimating(true);

        setGameState(prev => ({
          ...prev,
          score: prev.score + totalWinBonuses,
          totalScore: prev.totalScore + totalWinBonuses,
          streak: 0,
          estimatedIQ: Math.min(200, prev.estimatedIQ + 4),
          levelTargets: newTargets,
        }));

        if (currentUser) {
          const saveState = {
            totalScore: gameStateRef.current.totalScore + currentPoints + totalWinBonuses,
            streak: 0,
            level: gameState.level + 1,
            timeLeft: gameState.timeLeft + 60,
            estimatedIQ: Math.min(200, gameState.estimatedIQ + 4)
          };

          // SYNC TO GLOBAL PROFILE
          profileService.syncProgress(currentUser.id, finalPointsToSync, saveState.level, saveState.estimatedIQ)
            .then(() => loadProfile(currentUser.id))
            .catch(e => console.error("Error syncing progress:", e));

          profileService.saveGameState(currentUser.id, saveState)
            .catch(e => {
              if (e?.name !== 'AbortError' && !e?.message?.includes('signal is aborted without reason')) {
                console.error("Error saving game state:", e);
              }
            });
          setSavedGame(saveState);
        }
      } else {
        // NOT ALL DONE - CONTINUE PLAYING
        // setGameState was already called at the top of handleSuccess for consistent UI update
        // SYNC DUEL STATS (Non-Winning Move)
        if (activeMatch?.isDuel && currentUser) {
          // Calculate localTargetsFound for this scope
          const localTargetsFound = newTargets.filter(t => t.completed).length;

          if (duelMode === 'standard') {
            // STANDARD MODE: Score logic
            matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, newScore, localTargetsFound)
              .catch(e => console.error("Error syncing duel stats:", e));

            // CHECK WIN CONDITION HERE TOO
            if (localTargetsFound >= 5) {
              (async () => {
                try {
                  await matchService.declareWinner(activeMatch.id, currentUser.id);
                  processedWinRef.current = activeMatch.id;

                  // Optimistic Data Update
                  setLatestMatchData(prev => ({
                    ...prev,
                    status: 'finished',
                    winner_id: currentUser.id,
                    player1_score: activeMatch.isP1 ? newScore : prev?.player1_score,
                    player2_score: !activeMatch.isP1 ? newScore : prev?.player2_score,
                    p1_rounds: activeMatch.isP1 ? 5 : prev?.p1_rounds,
                    p2_rounds: !activeMatch.isP1 ? 5 : prev?.p2_rounds,
                  }));

                  // SYNC GLOBAL SCORE
                  const finalPointsToSync = newScore;
                  await profileService.syncProgress(currentUser.id, finalPointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ);
                  await loadProfile(currentUser.id);

                  soundService.playLevelComplete();

                  setTimeout(() => {
                    if (videoRef.current) {
                      const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
                      const vidSrc = WIN_VIDEOS[winIdx];
                      videoRef.current.src = vidSrc;
                      videoRef.current.muted = false;
                      videoRef.current.load();
                      videoRef.current.play().catch(e => console.warn("Duel win video blocked:", e));
                      setWinVideoSrc(vidSrc);
                      setShowVideo(true);
                      setIsVideoVisible(true);
                    }
                  }, 800);
                } catch (e) { console.error(e); }
              })();
              setSelectedPath([]);
              return;
            }

          } else {
            // Blitz/TimeAttack generic sync
            const currentRounds = activeMatch.isP1 ? duelRounds.p1 : duelRounds.p2;
            matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, localTargetsFound, currentRounds)
              .catch(e => console.error("Error syncing duel stats:", e));
          }
        }

        // TIME ATTACK: Individual Target Refill
        if (duelMode === 'time_attack' || activeMatch?.mode === 'time_attack') {
          setTimeout(() => {
            const currentState = gameStateRef.current;
            if (!currentState || !currentState.grid) return;

            const currentGrid = currentState.grid;
            const currentRefTargets = currentState.levelTargets || [];
            const allSols = Array.from(findAllSolutions(currentGrid));
            const activeValues = currentRefTargets.filter(t => !t.completed).map(t => t.value);
            const candidates = allSols.filter(v => !activeValues.includes(v));

            if (candidates.length > 0) {
              const nextVal = candidates[Math.floor(Math.random() * candidates.length)];
              setGameState(prev => {
                const updated = [...prev.levelTargets];
                const idx = updated.findIndex(t => t.value === matchedValue && t.completed);
                if (idx !== -1) {
                  updated[idx] = { value: nextVal, completed: false };
                }
                return { ...prev, levelTargets: updated };
              });
              soundService.playPop();
            }
          }, 3000);
        }
      }
      setSelectedPath([]);
    } catch (error: any) {
      if (error?.name !== 'AbortError' && !error?.message?.includes('signal is aborted without reason')) {
        console.error("Critical error in handleSuccess:", error);
      }
      setGameState(prev => ({ ...prev, status: 'idle' }));
      setSelectedPath([]);
    }
  };

  const handleTimeAttackEnd = () => {
    // 1. Play Sound (Finished)
    soundService.playExternalSound('Fine_partita_win.mp3');

    // 2. Final Score Update and Finish Match
    if (activeMatch && currentUser) {
      processedWinRef.current = activeMatch.id;
      const myScore = gameStateRef.current.score; // This is POINTS (10, 20...)
      const oppScore = opponentScore;             // This is OPP POINTS (if synced correctly in Blitz)

      let winnerId: string | null = null;

      // Determine My Targets vs Opponent Targets (for Blitz)
      // Standard: Targets = Completed Count (Accumulated)
      // Blitz: Targets = Owned Count (Current)
      let myTargetsForSync = gameStateRef.current.levelTargets.filter(t => t.completed).length; // Default

      if (activeMatch.mode === 'blitz') {
        const myOwnerId = activeMatch.isP1 ? 'p1' : 'p2';
        const oppOwnerId = activeMatch.isP1 ? 'p2' : 'p1';

        const myOwned = gameStateRef.current.levelTargets.filter(t => t.owner === myOwnerId).length;
        const oppOwned = gameStateRef.current.levelTargets.filter(t => t.owner === oppOwnerId).length;

        // Use THESE for win calculation
        myTargetsForSync = myOwned;

        // 1. PRIMARY: Who has more TARGETS?
        if (myOwned > oppOwned) {
          winnerId = currentUser.id;
        } else if (oppOwned > myOwned) {
          winnerId = activeMatch.opponentId;
        } else {
          // 2. SECONDARY: Tie-Breaker (Points)
          if (myScore > oppScore) {
            winnerId = currentUser.id;
          } else if (oppScore > myScore) {
            winnerId = activeMatch.opponentId;
          } else {
            winnerId = null; // Perfect Draw
          }
        }
      } else {
        // STANDARD / TIME ATTACK Logic (Score based)
        // Score (Points) is primary here too usually?
        // Standard: "Vince chi fa 5 punti". We handle that in handleSuccess usually.
        // Time Attack: "Vince chi fa più punti".
        if (myScore > oppScore) winnerId = currentUser.id;
        else if (oppScore > myScore) winnerId = activeMatch.opponentId;
      }

      const iWon = winnerId === currentUser.id;

      // PASS POINTS TO GLOBAL:
      // If I won, I pass my Local Match Points (totalScore) to global.
      const pointsToSync = gameStateRef.current.totalScore + 100; // +100 Bonus

      // Sync Stats: Score (Points) AND Targets (Rounds)
      matchService.updateMatchStats(activeMatch.id, activeMatch.isP1, myScore, myTargetsForSync)
        .then(() => matchService.declareWinner(activeMatch.id, winnerId))
        .then(() => {
          if (iWon) {
            // SYNC TO GLOBAL PROFILE - Score + Win Bonus
            // Use 'pointsToSync' calculated above (Local Points + Bonus)
            profileService.syncProgress(currentUser.id, pointsToSync, gameStateRef.current.level, gameStateRef.current.estimatedIQ)
              .then(() => loadProfile(currentUser.id));
          }
        })
        .catch(e => console.error("Error ending time attack:", e));

      // 3. Play Video before Recap
      if (iWon) {
        setTimeout(() => {
          if (videoRef.current) {
            const winIdx = Math.floor(Math.random() * WIN_VIDEOS.length);
            const vidSrc = WIN_VIDEOS[winIdx];
            videoRef.current.src = vidSrc;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("TimeAttack win video blocked:", e));
            soundService.playWinner(winIdx);
            setWinVideoSrc(vidSrc);
            setShowVideo(true);
            setIsVideoVisible(true);
          }
        }, 800);
      } else {
        setTimeout(() => {
          if (videoRef.current) {
            const loseVid = LOSE_VIDEOS[0];
            videoRef.current.src = loseVid;
            videoRef.current.muted = true;
            videoRef.current.load();
            videoRef.current.play().catch(e => console.warn("TimeAttack loss video blocked:", e));
            soundService.playLose();
            setLoseVideoSrc(loseVid);
            setShowLostVideo(true);
            setIsVideoVisible(true);
          }
        }, 800);
      }

      // 4. Show Recap trigger handles by Video Close
      // Fallback only if no video
      if (!iWon && !activeMatch?.isDuel) {
        // Should not happen here given logic
      }
    } else {
      setGameState(prev => ({ ...prev, status: 'idle' }));
      setShowDuelRecap(true);
    }
  };

  const handleError = () => {
    soundService.playError();
    setGameState(prev => ({
      ...prev,
      streak: 0,
      lastLevelPerfect: false,
      basePoints: BASE_POINTS_START,
      estimatedIQ: Math.max(70, prev.estimatedIQ - 1.5),
    }));
    setSelectedPath([]);
  };



  const nextLevel = () => {
    soundService.playUIClick();
    setIsVictoryAnimating(false);
    const nextLvl = gameState.level + 1;
    setGameState(prev => ({
      ...prev,
      level: nextLvl,
      status: 'playing',
      streak: 0,
      // CARRY OVER: Add 60s to whatever is left
      timeLeft: prev.timeLeft + 60,
    }));
    // Pass explicit level to avoid stale state
    generateGrid(nextLvl);
  };



  useEffect(() => {
    if (gameState.status === 'level-complete' || gameState.status === 'game-over') {
      getIQInsights(gameState.totalScore, gameState.level, gameState.timeLeft).then(setInsight);
    }
  }, [gameState.status, gameState.totalScore, gameState.level, gameState.timeLeft]); // Added dependencies

  // BOSS UNLOCK CHECKER
  useEffect(() => {
    if (gameState.status === 'idle' && userProfile) {
      // BOSS 1 UNLOCK (Level > 5)
      if ((userProfile.max_level || 1) > 5) {
        const key = `boss_unlock_seen_1_${userProfile.id}`;
        if (localStorage.getItem(key) !== 'true') {
          setTimeout(() => {
            // Play Unlock Video (Placeholder for now)
            setShowHomeTutorial(false); // Hide tutorial if overlapping
            showToast("⚠️ LIVELLO BOSS SBLOCCATO!", [{ label: "GIOCA ORA", onClick: () => setActiveModal('boss_selection') }]);
            soundService.playBadge(); // Alert Sound
            localStorage.setItem(key, 'true');
          }, 3000);
        }
      }
    }
  }, [gameState.status, userProfile, showToast]);

  /* INPUT BLOCKING LOGIC */
  const canInteract = () => {
    // STRICTLY BLOCK if game is over or paused or not playing
    if (gameState.status !== 'playing') return false;
    if (isPaused) return false;
    if (isVictoryAnimating) return false;
    if (showVideo || showLostVideo) return false;
    if (showDuelRecap) return false; // Explicitly block if recap is open
    return true;
  };

  const onStartInteraction = async (id: string) => {
    if (!canInteract()) return;
    await handleUserInteraction();

    const cell = grid.find(c => c.id === id);
    if (cell && cell.type === 'number') {
      soundService.playSelect();
      setIsDragging(true);
      setSelectedPath([id]);
      setPreviewResult(parseInt(cell.value));

      // [FIX] SELECTION AUTO-DESELECT (1 SECOND)
      if (selectionTimeoutRef.current) window.clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = window.setTimeout(() => {
        setSelectedPath(prev => {
          if (prev.length === 1 && prev[0] === id) {
            setPreviewResult(null);
            return [];
          }
          return prev;
        });
      }, 500);
    }
  };

  const isAdjacent = (cell1: HexCellData, cell2: HexCellData): boolean => {
    if (theme === 'orange') {
      const dr = Math.abs(cell1.row - cell2.row);
      const dc = Math.abs(cell1.col - cell2.col);
      // Rectilinear adjacency: Up/Down OR Left/Right
      return (dr === 1 && dc === 0) || (dr === 0 && dc === 1);
    }

    const dr = Math.abs(cell1.row - cell2.row);
    const dc = cell2.col - cell1.col;

    // Stessa riga
    if (dr === 0) return Math.abs(dc) === 1;

    // Righe adiacenti
    if (dr === 1) {
      // Per il sistema offset a righe pari
      if (cell1.row % 2 === 0) {
        return dc === 0 || dc === -1;
      } else {
        return dc === 0 || dc === 1;
      }
    }
    return false;
  };

  const onMoveInteraction = (id: string) => {
    if (!isDragging || !canInteract()) return;
    // BACKTRACKING LOGIC
    // Se l'utente torna alla penultima casella selezionata, rimuovi l'ultima (backtrack)
    if (selectedPath.length > 1 && id === selectedPath[selectedPath.length - 2]) {
      soundService.playSelect(); // Suono feedback rimozione
      const newPath = selectedPath.slice(0, -1);
      setSelectedPath(newPath);
      setPreviewResult(calculateResultFromPath(newPath));
      return;
    }

    if (selectedPath.includes(id)) return;

    const lastId = selectedPath[selectedPath.length - 1];
    const lastCell = grid.find(c => c.id === lastId);
    const currentCell = grid.find(c => c.id === id);

    if (lastCell && currentCell) {
      // Regola 1: Alternanza Tipi (Numero -> Operatore o viceversa)
      const typeCheck = lastCell.type !== currentCell.type;

      // Regola 2: Adiacenza Fisica (Deve essere un vicino diretto nell'esagono)
      const adjacencyCheck = isAdjacent(lastCell, currentCell);

      if (typeCheck && adjacencyCheck) {
        soundService.playSelect();
        const newPath = [...selectedPath, id];
        setSelectedPath(newPath);
        setPreviewResult(calculateResultFromPath(newPath));

        // Clear selection timeout if we started a path
        if (selectionTimeoutRef.current) {
          window.clearTimeout(selectionTimeoutRef.current);
          selectionTimeoutRef.current = null;
        }
      }
    }
  };

  // Logic for First Selection (Click/Tap) - Removed selectionTimeoutRef logic
  const onSelectionStart = (id: string) => {
    // No timeout logic needed here anymore
  };

  const handleGlobalEnd = () => {
    if (selectionTimeoutRef.current) {
      window.clearTimeout(selectionTimeoutRef.current);
      selectionTimeoutRef.current = null;
    }
    if (isDragging) {
      setIsDragging(false);
      evaluatePath(selectedPath);
    }
  };





  const handleVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();
    setIsBossBonusPlaying(false);

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    // 3. Unmount after fade and Show Recap if Duel
    setTimeout(() => {
      setShowVideo(false);
      setIsVictoryAnimating(false);

      if (activeMatch?.isDuel) {
        setShowDuelRecap(true);
        // Ensure we are idle to stop game interaction
        setGameState(prev => ({ ...prev, status: 'idle' }));
      } else if (gameState.isBossLevel) {
        setActiveModal('boss_selection');
        setGameState(prev => ({ ...prev, status: 'idle', isBossLevel: false, bossLevelId: null }));
      } else {
        setGameState(prev => ({
          ...prev,
          status: 'level-complete'
        }));
      }
    }, 2000);
  };

  const handleLostVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    // 3. Unmount after fade and Show Recap if Duel
    setTimeout(() => {
      setShowLostVideo(false);
      if (activeMatch?.isDuel) {
        setShowDuelRecap(true);
        setGameState(prev => ({ ...prev, status: 'idle' }));
      }
    }, 2000);
  };

  const handleBossIntroClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    setShowBossIntro(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    setTimeout(() => {
      setShowBossIntro(false);
      setGameState(prev => ({ ...prev, status: 'playing', timeLeft: 90 }));
      soundService.playSuccess();
    }, 1000);
  };

  const handleSurrenderVideoClose = () => {
    // Terminazione immediata quando si clicca skip
    setIsVideoVisible(false);
    soundService.stopAllVideoSounds();

    // Stop video immediately
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      videoRef.current.volume = 0;
    }

    setTimeout(() => {
      setShowSurrenderVideo(false);
      setGameState(prev => {
        // Bonus points for surrender win
        const bonus = (duelMode === 'blitz' ? 50 : 100);
        if (currentUser) {
          profileService.syncProgress(currentUser.id, bonus, prev.level, prev.estimatedIQ)
            .then(() => loadProfile(currentUser.id));
        }
        return { ...prev, status: 'opponent-surrendered' };
      });
    }, 800);
  };

  return (
    <>
      {showIntro && <IntroVideo onFinish={() => {
        setShowIntro(false);
        setGameState(prev => ({ ...prev, status: 'idle' }));
        // Check for Home Tutorial
        try {
          if (localStorage.getItem('comic_home_tutorial_done') !== 'true') {
            setTimeout(() => setShowHomeTutorial(true), 500);
          }
        } catch (e) { console.warn("Tutorial check skipped", e); }
      }} />}
      <div
        className={`fixed inset-0 w-full h-[100dvh] text-slate-100 font-sans overflow-hidden select-none transition-colors duration-1000`}
        style={{
          background: gameState.isBossLevel ? '#022c22' : 'transparent'
        }}
        onPointerUp={handleGlobalEnd}
        onPointerLeave={handleGlobalEnd}
      >
        {/* MAIN BLUE BACKGROUND IMAGE LAYER */}
        <div className={`fixed inset-0 bg-[url('/sfondoblu.png')] bg-cover bg-center transition-opacity duration-1000 z-[-2] ${!gameState.isBossLevel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>

        {/* BOSS BACKGROUND FALLBACK LAYER (Solid Green) - Ensures no blue leaks ever */}
        <div className={`fixed inset-0 bg-emerald-950 z-[-1] transition-opacity duration-300 ${gameState.isBossLevel ? 'opacity-100' : 'opacity-0'}`}></div>

        {/* BOSS BOTTOM PATCH - Extra safety for safe-area */}
        <div className={`fixed -bottom-40 left-0 w-full h-80 bg-emerald-950 z-[-1] ${gameState.isBossLevel ? 'opacity-100' : 'opacity-0'}`}></div>

        {/* BOSS BACKGROUND IMAGE LAYER - Extreme bleed to cover everything */}
        <div className={`fixed -inset-[20%] w-[140%] h-[140%] bg-[url('/sfondo_green.png')] bg-cover bg-center bg-no-repeat transition-opacity duration-1000 z-0 ${gameState.isBossLevel ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}></div>




        {/* WIN VIDEO OVERLAY REMOVED (Duplicate/Legacy) */}

        {/* UNIFIED VIDEO OVERLAY - Always in DOM for Mobile Unlock */}
        <div
          className={`fixed inset-0 z-[2000] bg-black flex items-center justify-center transition-opacity duration-[800ms] ease-out 
            ${(showVideo || showLostVideo || showSurrenderVideo || showBossIntro) ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
          onPointerDown={() => {
            if (showVideo) handleVideoClose();
            else if (showLostVideo) handleLostVideoClose();
            else if (showSurrenderVideo) handleSurrenderVideoClose();
            else if (showBossIntro) handleBossIntroClose();
          }}
        >
          <video
            ref={videoRef}
            src={isBossBonusPlaying ? '/Bonus30secondiboss.mp4' : (showVideo ? winVideoSrc : (showLostVideo ? loseVideoSrc : (showSurrenderVideo ? surrenderVideoSrc : (showBossIntro ? '/Boss1intro.mp4' : ''))))}
            className="w-full h-full object-cover"
            playsInline
            autoPlay
            onPlay={() => {
              if (videoRef.current) videoRef.current.volume = 0.7;
              setIsVideoVisible(true);

              // SYNC BOSS AUDIO
              if (gameState.bossLevelId === 1) {
                if (showBossIntro) {
                  soundService.stopBossIntro();
                  soundService.playBossIntro();
                } else if (showVideo) {
                  if (isBossBonusPlaying) {
                    soundService.stopBoss1vittoria();
                    soundService.playBossBonus();
                  } else {
                    soundService.stopBossBonus();
                    soundService.playBoss1vittoria();
                  }
                } else if (showLostVideo) {
                  soundService.stopBoss1sconfitta();
                  soundService.playBoss1sconfitta();
                }
              }
            }}
            onEnded={() => {
              if (showVideo) {
                if (gameState.bossLevelId === 1 && isBossBonusPlaying) {
                  // STEP 1 COMPLETE: Bonus Video Ended -> Play Boss Victory Video
                  setIsBossBonusPlaying(false);
                  setWinVideoSrc('/Boss1vittoria.mp4');
                  // Force reload to ensure src update
                  setTimeout(() => {
                    if (videoRef.current) {
                      videoRef.current.load();
                      videoRef.current.play().catch(e => console.warn("Boss victory video blocked:", e));
                    }
                  }, 50);
                } else {
                  // STEP 2 COMPLETE: Boss Victory Video Ended -> Close and return to lobby

                  // AWARD BADGE HERE for Boss 1
                  if (gameState.bossLevelId === 1 && currentUser) {
                    const badgeId = 'boss_matematico';
                    if (!userProfile?.badges?.includes(badgeId)) {
                      const newBadges = [...(userProfile?.badges || []), badgeId];
                      // Update Local
                      setUserProfile(prev => prev ? ({ ...prev, badges: newBadges }) : null);
                      // Update Remote
                      profileService.updateProfile({ id: currentUser.id, badges: newBadges }).catch(e => console.error("Badge update failed", e));
                      showToast("🏆 Medaglia Boss Sbloccata!");
                    }
                  }

                  handleVideoClose();
                }
              }
              else if (showLostVideo) handleLostVideoClose();
              else if (showSurrenderVideo) handleSurrenderVideoClose();
              else if (showBossIntro) handleBossIntroClose();
            }}
          />

          {/* Audio Toggle for Boss Intro/Win/Loss */}
          {(showBossIntro || ((showVideo || showLostVideo) && gameState.isBossLevel)) && (
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
                const newMuted = !isMuted;
                setIsMuted(newMuted);
                soundService.setMuted(newMuted);
              }}
              className={`absolute top-12 right-6 z-[2010] p-3 rounded-full border transition-all active:scale-95 shadow-lg
                    ${!isMuted
                  ? 'bg-emerald-500 border-emerald-400 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                  : 'bg-black/40 backdrop-blur-md border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                }`}
            >
              {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
            </button>
          )}

          {/* Overlay color based on state */}
          {showLostVideo && <div className="absolute inset-0 bg-red-900/10 mix-blend-overlay pointer-events-none"></div>}
          {showSurrenderVideo && <div className="absolute inset-0 bg-blue-900/10 mix-blend-overlay pointer-events-none"></div>}

          {(showVideo || showLostVideo || showSurrenderVideo || showBossIntro) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-50 pointer-events-none">
              {/* FAIL-SAFE TAP TO PLAY (Only visible if video stuck/not visible) */}
              {/* FAIL-SAFE TAP TO PLAY REMOVED - AUTOMATIC ONLY */}


              <button
                className="absolute bottom-12 right-12 z-50 px-6 py-3 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-white font-orbitron font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-3 active:scale-95 group pointer-events-auto"
                onPointerDown={(e) => {
                  e.stopPropagation();
                  if (showVideo) handleVideoClose();
                  else if (showLostVideo) handleLostVideoClose();
                  else if (showSurrenderVideo) handleSurrenderVideoClose();
                  else if (showBossIntro) handleBossIntroClose();
                }}
              >
                <span>SKIP {showBossIntro ? 'INTRO' : ''}</span>
                <FastForward size={14} className={showLostVideo ? (gameState.isBossLevel ? "text-emerald-400" : "text-red-500") : (showSurrenderVideo ? "text-blue-500" : ((showBossIntro || (showVideo && gameState.isBossLevel)) ? "text-emerald-400" : "text-[#FF8800]"))} />
              </button>
            </div>
          )}
        </div>


        <ParticleEffect trigger={triggerParticles} />

        {/* Abstract Curves Removed for single clean blue background */}

        {toast.visible && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[10000] animate-toast-in w-[90%] max-w-md">
            <div className="bg-transparent text-white px-8 py-5 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex flex-col items-center gap-4 border-[3px] border-[#FF8800] backdrop-blur-sm">
              <span className="font-bold text-center text-lg leading-snug drop-shadow-md">{toast.message}</span>
              {toast.actions && (
                <div className="flex gap-3 w-full justify-center">
                  {toast.actions.map((action, i) => (
                    <button
                      key={i}
                      onPointerDown={(e) => { e.stopPropagation(); action.onClick(); }}
                      className={`px-6 py-2.5 rounded-xl font-black uppercase text-sm tracking-wider transition-all active:scale-95 shadow-lg border-2
                                ${action.variant === 'secondary'
                          ? 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                          : 'bg-[#FF8800] text-white border-white hover:bg-[#FF9900]'
                        }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}



        {gameState.status === 'idle' && (
          <>
            <CharacterHelper />
            <div className="z-10 w-full max-w-xl flex flex-col items-center text-center px-6 animate-screen-in relative h-full justify-center -translate-y-5">

              {/* TOP LEFT: User Auth */}
              <div className="fixed bottom-4 left-4 z-50 flex gap-3 items-center" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                <button
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    if (currentUser) {
                      setActiveModal('logout_confirm');
                    } else {
                      showToast('Accesso richiesto');
                      setShowAuthModal(true);
                    }
                  }}
                  id={currentUser ? "user-profile-home" : "login-btn-home"}
                  className="flex items-center gap-3 pr-3 pl-1 py-1 rounded-full bg-black/40 border border-white/20 backdrop-blur-md hover:bg-black/60 transition-all group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-white/50 shadow-lg ${currentUser ? 'bg-[#FF8800] text-white' : 'bg-slate-700 text-slate-400 group-hover:bg-white group-hover:text-[#FF8800] transition-colors'}`}>
                    <User size={20} strokeWidth={2.5} />
                  </div>
                  {currentUser && (
                    <div className="flex flex-col items-start pl-2 leading-none">
                      <span className="font-orbitron font-bold text-xs text-white uppercase tracking-widest leading-none">
                        {userProfile?.username || 'GUEST'}
                      </span>
                      <span className="font-orbitron text-[8px] font-black text-[#FF8800] uppercase tracking-tighter mt-1">
                        {userProfile?.total_score || 0} PTS
                      </span>
                    </div>
                  )}
                </button>
              </div>

              {/* TOP RIGHT: Audio (Fixed at the very top) */}
              <div className="fixed top-12 right-6 z-[3000] flex gap-3 items-center">
                <button
                  onPointerDown={toggleMute}
                  className={`w-12 h-12 rounded-full border-2 border-white/50 shadow-lg flex items-center justify-center active:scale-95 transition-all hover:scale-110
                    ${isMuted ? 'bg-slate-700 text-slate-400' : 'bg-[#FF8800] text-white'}`}
                  title="Audio"
                  id="audio-btn-home"
                >
                  {isMuted ? <VolumeX size={24} strokeWidth={2.5} /> : <Volume2 size={24} strokeWidth={2.5} />}
                </button>
              </div>

              {/* BOTTOM RIGHT ICONS: Admin & Tutorial (FIXED Position) */}
              <div className="fixed bottom-4 right-4 z-[2000] flex gap-3" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
                {/* Tutorial Icon */}
                <button
                  onPointerDown={async (e) => { e.stopPropagation(); await handleUserInteraction(); soundService.playUIClick(); setTutorialStep(0); setActiveModal('tutorial'); }}
                  id="tutorial-btn-home"
                  className="w-12 h-12 rounded-full bg-[#FF8800] text-white border-2 border-white/50 shadow-lg flex items-center justify-center active:scale-95 transition-all hover:scale-110"
                  title="Tutorial"
                >
                  <HelpCircle size={24} strokeWidth={2.5} />
                </button>

                {/* Quick Invite Button */}
                <button
                  onPointerDown={async (e) => { e.stopPropagation(); await handleUserInteraction(); handleQuickInvite(); }}
                  id="invite-btn-home"
                  className="w-12 h-12 rounded-full bg-[#FF8800] text-white border-2 border-white/50 shadow-lg flex items-center justify-center active:scale-95 transition-all hover:scale-110"
                  title="Invita Amico"
                >
                  <Send size={22} strokeWidth={3} className="ml-0.5" />
                </button>

                {/* Admin Access */}
                <button
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    setActiveModal('admin');
                  }}
                  className="w-12 h-12 rounded-full bg-[#FF8800] text-white border-2 border-white/50 shadow-lg flex items-center justify-center active:scale-95 transition-all hover:scale-110"
                  title="Admin Access"
                >
                  <Shield size={24} strokeWidth={2.5} />
                </button>
              </div>
              <div className="mb-6 flex flex-col items-center">
                {/* Logo: Custom Shape Image with White Border & Brain */}
                {/* Logo: Pure Color CSS Mask Implementation */}
                {/* Logo: Custom Shape Image with White Border & Brain */}
                {/* Logo: Pure Color CSS Mask Implementation */}
                <div
                  onPointerDown={async (e) => {
                    e.stopPropagation();
                    await handleUserInteraction();
                    soundService.playUIClick();
                    setActiveModal('profile');
                  }}
                  id="logo-home"
                  className={`relative w-36 h-36 flex items-center justify-center mb-4 transition-all duration-[2000ms] ease-in-out group cursor-pointer ${logoAnim ? 'scale-110 drop-shadow-[0_0_25px_rgba(255,136,0,0.6)]' : 'hover:scale-110'}`}
                  title="Apri Profilo"
                >
                  {/* Custom Octagon Image */}
                  <img src="/octagon-base.png" alt="Logo Base" className="absolute inset-0 w-full h-full object-contain drop-shadow-lg" />

                  {/* Brain Icon - Centered */}
                  <Brain className="relative w-16 h-16 text-white drop-shadow-md z-10" strokeWidth={2.5} />

                </div>

                <h1 className="text-6xl sm:text-8xl font-black font-orbitron tracking-tighter text-[#FF8800] lowercase" style={{ WebkitTextStroke: '3px white' }}>
                  number
                </h1>
              </div>

              {/* Tip Bubble Removed */}

              <div className="flex flex-col gap-4 items-center w-full max-w-sm relative z-20">
                <button
                  onPointerDown={handleStartGameClick}
                  id="play-btn-home"
                  className="w-full group relative overflow-hidden flex items-center justify-center gap-4 bg-gradient-to-r from-[#FF8800] to-[#FF5500] text-white py-5 rounded-2xl font-orbitron font-black text-xl border-[4px] border-white shadow-[0_8px_0_rgba(0,0,0,0.2)] active:translate-y-1 active:shadow-[0_4px_0_rgba(0,0,0,0.2)] hover:scale-105 transition-all duration-300"
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <Play className="w-8 h-8 fill-current relative z-10" />
                  <span className="tracking-widest relative z-10">{savedGame && savedGame.level > 1 ? `CONTINUA LVL ${savedGame.level}` : "GIOCA"}</span>
                </button>

                <div className="grid grid-cols-2 gap-4 w-full">
                  {/* 1VS1 MODE BUTTON - NEURAL DUEL */}
                  {/* 1VS1 MODE BUTTON - SINGLE ENTRY */}
                  <button
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-rose-600 text-white py-5 rounded-xl border-[3px] border-white shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none hover:scale-105 transition-all duration-300 col-span-2 relative overflow-hidden group"
                    id="duel-btn-home"
                    onPointerDown={() => {
                      soundService.playUIClick();
                      if (!currentUser) {
                        showToast("Accedi per sfidare altri giocatori!");
                        setShowAuthModal(true);
                      } else {
                        setActiveModal('duel_selection'); // Open Selection logic
                      }
                    }}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <Swords className="w-8 h-8 animate-pulse text-yellow-300" />
                    <div className="flex flex-col items-start leading-none relative z-10">
                      <span className="font-orbitron text-xl font-black uppercase tracking-widest italic drop-shadow-md">NEURAL DUEL</span>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Sfida 1vs1 Realtime</span>
                    </div>
                    {/* Badge */}
                    <div className="absolute top-2 right-2 bg-red-600/90 backdrop-blur-md border border-white/20 px-2 py-0.5 rounded text-[8px] font-bold text-white animate-pulse shadow-lg">NEW MODES</div>
                  </button>

                  <button
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-5 rounded-xl border-[3px] border-white shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none hover:scale-105 transition-all duration-300 col-span-2 relative overflow-hidden group"
                    id="boss-btn-home"
                    onPointerDown={() => {
                      soundService.playUIClick();
                      setActiveModal('boss_selection');
                    }}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                    <Crown className="w-8 h-8 text-yellow-300 animate-[bounce_3s_infinite]" />
                    <div className="flex flex-col items-start leading-none relative z-10">
                      <span className="font-orbitron text-xl font-black uppercase tracking-widest drop-shadow-md">BOSS LEVELS</span>
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-wider">Sfide Epiche & Bonus</span>
                    </div>
                  </button>

                  <button
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white py-4 rounded-xl border-[3px] border-white shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none hover:scale-105 transition-all duration-300 col-span-1 relative overflow-hidden group"
                    id="challenges-btn-home"
                    onPointerDown={() => { soundService.playUIClick(); showToast("Nessun torneo attivo al momento"); }}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                    <Trophy className="w-5 h-5" />
                    <span className="font-orbitron text-xs font-black uppercase tracking-widest relative z-10">Tornei</span>
                  </button>

                  <button onPointerDown={async (e) => { e.stopPropagation(); await handleUserInteraction(); soundService.playUIClick(); setActiveModal('leaderboard'); }}
                    id="ranking-btn-home"
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-900 py-4 rounded-xl border-[3px] border-white shadow-[0_6px_0_rgba(0,0,0,0.1)] active:translate-y-1 active:shadow-none hover:scale-105 transition-all duration-300 col-span-1 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-15"></div>
                    <BarChart3 className="w-5 h-5 relative z-10" />
                    <span className="font-orbitron text-xs font-black uppercase tracking-widest relative z-10">RANKING</span>
                  </button>
                </div>

                {/* AUTH BUTTON */}
                {/* Auth Button Moved to Top Right - Removed from here */}

                {/* Audio Button Removed */}


              </div>
            </div>
          </>
        )}



        {gameState.status !== 'idle' && (
          <div className="w-full h-full flex flex-col items-center z-10 p-4 pt-12 sm:pt-4 max-w-4xl animate-screen-in">
            <header className="w-full max-w-2xl mx-auto mb-2 relative z-50">
              <div className={`
                relative w-full flex justify-between items-center px-4 py-3 rounded-[2.5rem] border-[4px] border-white shadow-[0_8px_0_rgba(0,0,0,0.15)]
                ${gameState.isBossLevel
                  ? 'bg-gradient-to-r from-lime-500 via-green-500 to-lime-600'
                  : 'bg-gradient-to-r from-orange-400 via-[#FF5500] to-orange-600'}
                transition-all duration-300
              `}>
                {/* Left Group: Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onPointerDown={(e) => {
                      goToHome(e);
                      setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null }));
                    }}
                    className={`w-11 h-11 rounded-full border-[3px] border-white flex items-center justify-center transition-all active:scale-90 shadow-md bg-white 
                      ${gameState.isBossLevel ? 'text-emerald-600' : 'text-[#FF8800]'}`}
                    title="Home"
                  >
                    <Home className="w-6 h-6" />
                  </button>
                  <button
                    onPointerDown={toggleMute}
                    className={`w-11 h-11 rounded-full border-[3px] border-white flex items-center justify-center transition-all active:scale-90 shadow-md bg-white 
                      ${gameState.isBossLevel ? 'text-emerald-600' : 'text-[#FF8800]'}`}
                  >
                    {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                  </button>
                </div>

                {/* Center: Floating Timer (Half-In/Half-Out) */}
                {/* Center: Floating Timer (Half-In/Half-Out) - CLICKABLE PAUSE */}
                <div id="timer-display-game" className="absolute left-1/2 -translate-x-1/2 top-1/2 transform translate-y-[-10%] z-[100] cursor-pointer group" onPointerDown={activeMatch?.isDuel ? undefined : togglePause}>
                  {/* Round Indicator - Only for Blitz - Now handled in Right Side Score */}
                  {activeMatch?.isDuel && duelMode === 'blitz' && false && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border-2 border-amber-400/50 text-amber-100 text-[11px] font-black font-orbitron px-5 py-1.5 rounded-full z-[110] whitespace-nowrap shadow-[0_0_20px_rgba(251,191,36,0.2)] animate-pulse-slow">
                      ROUND {duelRounds.p1 + duelRounds.p2 + 1} / 5
                    </div>
                  )}

                  {gameState.isBossLevel ? (
                    <div className={`relative w-24 h-24 flex items-center justify-center transition-all duration-300 ${isPaused ? 'scale-110' : 'hover:scale-105'}`}>
                      {/* External White Frame */}
                      <div className="absolute -inset-1 rotate-45 rounded-xl border-[4px] border-white pointer-events-none"></div>

                      <div className="absolute inset-0 bg-slate-900 rotate-45 rounded-xl border-[4px] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"></div>

                      {/* BOSS TIMER PROGRESS DIAMOND */}
                      <svg className="absolute inset-0 w-full h-full rotate-45 pointer-events-none z-20 overflow-visible">
                        <defs>
                          <filter id="bossGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                        </defs>
                        <rect
                          x="2" y="2" width="92" height="92" rx="12"
                          stroke="rgba(16, 185, 129, 0.2)"
                          strokeWidth="6"
                          fill="none"
                        />
                        {!isPaused && (
                          <rect
                            x="2" y="2" width="92" height="92" rx="12"
                            stroke="#10b981"
                            strokeWidth="6"
                            fill="none"
                            pathLength="100"
                            strokeDasharray="100"
                            strokeDashoffset={100 * (1 - (gameState.timeLeft / 90))}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-linear"
                            filter="url(#bossGlow)"
                          />
                        )}
                      </svg>

                      <div className="relative z-10 flex flex-col items-center justify-center text-white">
                        {isPaused ? (
                          <Pause className="w-8 h-8 text-emerald-400 animate-pulse" />
                        ) : (
                          <>
                            <span className="text-[8px] font-black text-emerald-400 uppercase leading-none mb-1 tracking-widest">BOSS</span>
                            <span className="font-black font-orbitron text-3xl leading-none drop-shadow-md">{gameState.timeLeft}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={`relative w-24 h-24 rounded-full bg-slate-900 border-[4px] border-white flex items-center justify-center shadow-xl transition-all duration-300 ${isPaused ? 'border-[#FF8800] scale-110 shadow-[0_0_30px_rgba(255,136,0,0.5)]' : 'group-hover:scale-105'} ${(activeMatch?.isDuel && duelMode !== 'time_attack') ? 'border-red-500/50 grayscale-0 opacity-100 flex flex-col' : ''}`}>
                      <svg className="absolute inset-0 w-full h-full -rotate-90 scale-90">
                        <circle cx="50%" cy="50%" r="45%" stroke="rgba(255,255,255,0.1)" strokeWidth="8" fill="none" />
                        {!isPaused && (
                          <circle
                            cx="50%" cy="50%" r="45%"
                            stroke={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                              ? `rgb(${Math.floor(((opponentTargets || 0) / 5) * 205 + 34)}, ${Math.floor((1 - (opponentTargets || 0) / 5) * 129 + 68)}, 68)`
                              : (gameState.timeLeft <= 10 ? '#ef4444' : '#FF8800')}
                            strokeWidth="8"
                            fill="none"
                            strokeDasharray="283"
                            strokeDashoffset={activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz'
                              ? 283 - (283 * (opponentTargets || 0) / 5)
                              : (283 * (1 - gameState.timeLeft / 60))
                            }
                            strokeLinecap="round"
                            className="transition-all duration-1000"
                          />
                        )}
                      </svg>
                      {isPaused ? (
                        <Pause className="w-10 h-10 text-white animate-pulse" fill="white" />
                      ) : (
                        <>
                          {activeMatch?.isDuel && duelMode !== 'time_attack' && duelMode !== 'blitz' && (
                            <span className="text-[8px] font-black text-slate-500 uppercase leading-none mb-1">
                              AVV
                            </span>
                          )}
                          <span className={`font-black font-orbitron text-white ${activeMatch?.isDuel ? 'text-4xl' : 'text-3xl'}`}>
                            {activeMatch?.isDuel
                              ? ((duelMode === 'time_attack' || duelMode === 'blitz') ? gameState.timeLeft : opponentTargets)
                              : gameState.timeLeft}
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* RIGHT SIDE: SCORE / ROUNDS */}
                {activeMatch?.isDuel ? (
                  <div className="flex items-center gap-3 pl-20 sm:pl-0">

                    <div id="score-display-game" className="w-14 h-14 rounded-full bg-white border-[3px] border-white/20 flex flex-col items-center justify-center shadow-xl transform hover:scale-105 transition-transform">
                      {duelMode === 'blitz' ? (
                        <>
                          <span className="text-[7px] font-black text-[#FF8800] leading-none mb-0.5 uppercase">SCORE</span>
                          <span className="text-xl font-black font-orbitron text-[#FF8800] leading-none">
                            {gameState.score}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[7px] font-black text-[#FF8800] leading-none mb-0.5 uppercase">PTS</span>
                          <span className="text-xl font-black font-orbitron text-[#FF8800] leading-none">
                            {gameState.score}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                      <div id="score-display-game" className={`w-11 h-11 rounded-full border-[3px] border-white flex flex-col items-center justify-center shadow-md bg-white ${gameState.isBossLevel ? 'text-emerald-600' : 'text-[#FF8800]'}`}>
                        <span className="text-[7px] font-black uppercase leading-none opacity-80 mb-0.5">PTS</span>
                        <span className="text-xs font-black font-orbitron leading-none tracking-tighter">{gameState.totalScore}</span>
                      </div>
                      <div className={`w-11 h-11 rounded-full border-[3px] border-white flex flex-col items-center justify-center shadow-md bg-white ${gameState.isBossLevel ? 'text-emerald-600' : 'text-[#FF8800]'}`}>
                        <span className="text-[7px] font-black uppercase leading-none opacity-80 mb-0.5">{gameState.isBossLevel ? 'BOSS' : 'LV'}</span>
                        <span className="text-sm font-black font-orbitron leading-none">{gameState.isBossLevel ? gameState.bossLevelId : gameState.level}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </header>

            <main className="relative flex-grow w-full flex flex-col items-center justify-center">
              {gameState.status === 'playing' && (
                <div className="w-full flex flex-col items-center h-full relative">
                  {/* Info Row: Current Calculation Badge (Left) */}
                  <div className="w-full max-w-2xl px-4 flex justify-start items-center min-h-[50px] mb-2 mt-6">
                    <div className={`transition-all duration-300 transform origin-left
                        ${isDragging && selectedPath.length > 0 ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 -translate-x-4 pointer-events-none'}`}>
                      <div className={`px-5 py-2 rounded-xl border-[3px] flex items-center gap-3 shadow-md transition-colors duration-200
                          ${(previewResult !== null && (gameState.isBossLevel
                          ? (gameState.levelTargets.find(t => !t.completed)?.value === previewResult)
                          : gameState.levelTargets.some(t => t.value === previewResult && !t.completed)))
                          ? (gameState.isBossLevel
                            ? 'bg-emerald-600 border-white text-white scale-105 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                            : 'bg-[#FF8800] border-white text-white scale-105')
                          : (gameState.isBossLevel
                            ? 'bg-white border-emerald-600 text-emerald-600'
                            : 'bg-white border-[#FF8800] text-[#FF8800]')}`}>
                        <span className="text-[10px] font-black uppercase tracking-wider opacity-80">Totale:</span>
                        <span className="text-2xl font-black font-orbitron leading-none">
                          {previewResult !== null ? previewResult : '...'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2 mb-5">
                    {/* Level Targets List */}
                    {/* Level Targets List */}
                    <div className="flex gap-2 items-center flex-wrap justify-center max-w-[300px]" id="targets-display-tutorial">
                      {gameState.isBossLevel ? (
                        // BOSS MODE: Display only CURRENT target (Large)
                        (() => {
                          const activeTarget = gameState.levelTargets.find(t => !t.completed);
                          if (!activeTarget) return null; // All done (handled by win screen usually)
                          const remainingCount = gameState.levelTargets.filter(t => !t.completed).length;
                          const totalCount = gameState.levelTargets.length;
                          const currentIndex = totalCount - remainingCount + 1;

                          return (
                            <div className="flex flex-col items-center animate-bounce-short w-full">
                              <div className="flex flex-col items-center justify-center w-full max-w-[240px] h-24 px-4 rounded-xl border-[4px] border-emerald-400 bg-emerald-900/80 shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300 transform hover:scale-105">
                                <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-[0.2em] mb-1">
                                  TARGET {currentIndex}/{totalCount}
                                </span>
                                <span className={`font-orbitron font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] leading-none
                                  ${activeTarget.displayValue ? 'text-2xl tracking-widest' : 'text-5xl'}`}>
                                  {activeTarget.displayValue || activeTarget.value}
                                </span>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        // STANDARD MODE: Display All
                        gameState.levelTargets.map((t, i) => {
                          const isDominion = activeMatch?.isDuel && duelMode === 'blitz';
                          let bgClass = 'bg-[#0055AA] border-white/50'; // Default Blue

                          if (isDominion) {
                            // Dominion Styling
                            const isMyTarget = (t.owner === 'p1' && activeMatch?.isP1) || (t.owner === 'p2' && !activeMatch?.isP1);
                            const isEnemyTarget = (t.owner === 'p1' && !activeMatch?.isP1) || (t.owner === 'p2' && activeMatch?.isP1);

                            if (isMyTarget) bgClass = 'bg-emerald-500 border-white scale-110 shadow-[0_0_15px_rgba(16,185,129,0.6)] z-10';
                            else if (isEnemyTarget) bgClass = 'bg-rose-600 border-white/80 opacity-90 scale-95';
                          } else {
                            // Standard Styling
                            if (t.completed) bgClass = 'bg-[#FF8800] border-white scale-110 shadow-[0_0_15px_rgba(255,136,0,0.6)]';
                          }

                          return (
                            <div key={i} className={`
                                    flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-300 border-2
                                    ${bgClass}
                                     font-orbitron font-black text-white text-xl shadow-lg drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]
                                 ${t.displayValue ? 'text-[10px] sm:text-xs leading-tight whitespace-nowrap px-1' : 'text-xl'} 
                                 `}>
                              {t.displayValue || t.value}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  <div className="relative flex-grow w-full flex items-center justify-center overflow-visible">

                    {isPaused && (
                      <div id="pause-overlay-game" className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl rounded-3xl transition-all animate-fadeIn">
                        <div className="flex flex-col items-center gap-4">
                          <Pause className="w-24 h-24 text-white opacity-100 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                          <span className="font-orbitron font-black text-2xl text-white tracking-[0.3em] animate-pulse">PAUSA</span>
                        </div>
                      </div>
                    )}

                    <div id="grid-container-game" className={`relative mx-auto transition-all duration-500 transform
                    ${isPaused ? 'opacity-10 scale-95 filter blur-lg pointer-events-none grayscale' : 'opacity-100 scale-100 filter-none'}
                    ${theme === 'orange'
                        ? 'w-[calc(272px*var(--hex-scale))] h-[calc(376px*var(--hex-scale))]'
                        : 'w-[calc(400px*var(--hex-scale))] h-[calc(480px*var(--hex-scale))]'
                      }`}>
                      {grid.map(cell => (
                        <HexCell key={cell.id} data={cell} isSelected={selectedPath.includes(cell.id)} isSelectable={!isVictoryAnimating && !isPaused} onMouseEnter={onMoveInteraction} onMouseDown={onStartInteraction} theme={theme} isBossLevel={gameState.isBossLevel} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* BLITZ ROUND WON OVERLAY */}
              {gameState.status === 'round-won' && (
                <div className="absolute inset-0 z-[150] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn">
                  <div className="text-center p-8 bg-slate-900 border-4 border-[#FF8800] rounded-[3rem] shadow-[0_0_50px_rgba(255,136,0,0.5)] animate-bounce-slow">
                    <FastForward className="w-16 h-16 text-[#FF8800] mx-auto mb-4" />
                    <h2 className="text-4xl font-black font-orbitron text-white uppercase tracking-widest leading-none mb-2">ROUND VINTO!</h2>
                    <div className="text-lg font-black font-orbitron text-[#FF8800] uppercase tracking-tighter">Sincronizzazione in corso...</div>
                    <div className="mt-4 flex gap-2 justify-center">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-3 h-3 rounded-full bg-[#FF8800] animate-pulse" style={{ animationDelay: `${i * 0.2}s` }}></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}


              {gameState.status === 'game-over' && (
                <div className={`bg-slate-900/60 p-8 rounded-[2.5rem] text-center modal-content animate-screen-in w-full max-w-sm mt-20 relative overflow-hidden border-[4px] shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl
                  ${gameState.isBossLevel
                    ? 'border-emerald-500/50 shadow-[0_0_50px_rgba(16,185,129,0.3)]'
                    : 'border-[#FF8800] shadow-[0_0_50px_rgba(255,136,0,0.2)]'}`}>
                  {/* Background Texture Removed */}

                  <AlertTriangle className={`w-12 h-12 mx-auto mb-2 animate-pulse ${gameState.isBossLevel ? 'text-emerald-400' : 'text-[#FF8800]'}`} />
                  <h2 className={`text-3xl font-black font-orbitron mb-1 tracking-wider ${gameState.isBossLevel ? 'text-emerald-400' : 'text-[#FF8800]'}`}>HAI PERSO</h2>
                  <div className="text-[10px] font-bold text-white mb-6 uppercase tracking-[0.2em]">{gameState.isBossLevel ? 'Boss Sfidato' : 'Livello Non Superato'}</div>

                  <div className="space-y-3 relative z-10">
                    <button onPointerDown={(e) => {
                      e.stopPropagation();
                      resetDuelState();
                      if (gameState.isBossLevel && gameState.bossLevelId) {
                        startBossGame(gameState.bossLevelId);
                      } else {
                        startGame(gameState.level);
                      }
                    }}
                      className="w-full bg-white text-slate-950 py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-xs shadow-lg active:scale-95 transition-all border-2 border-slate-200">
                      {gameState.isBossLevel ? 'RIPROVA BOSS' : `RIGIOCA LIVELLO ${gameState.level}`}
                    </button>
                    <button onPointerDown={(e) => {
                      e.stopPropagation();
                      resetDuelState(activeMatch?.id, currentUser?.id);
                      goToHome();
                    }}
                      className="w-full bg-slate-800 text-slate-400 py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm border border-slate-700 active:scale-95 transition-all hover:bg-slate-700 hover:text-white">
                      TORNA ALLA HOME
                    </button>
                  </div>
                </div>
              )}

              {/* SURRENDER RECAP SCREEN */}
              {gameState.status === 'opponent-surrendered' && (
                <div className="glass-panel p-8 rounded-[2rem] text-center modal-content animate-screen-in w-full max-w-sm mt-12 relative overflow-hidden border-[3px] border-cyan-500 shadow-[0_0_60px_rgba(6,182,212,0.4)]">
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

                  <Trophy className="w-16 h-16 text-cyan-400 mx-auto mb-4 animate-[bounce_2s_infinite]" />
                  <h2 className="text-3xl font-black font-orbitron mb-2 text-cyan-400 tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">HAI VINTO</h2>
                  <div className="text-xs font-bold text-white mb-6 uppercase tracking-[0.1em] bg-cyan-500/10 py-1 rounded">Vittoria per Ritiro</div>

                  <div className="bg-slate-900/60 p-5 rounded-2xl mb-6 border border-cyan-500/20">
                    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Punteggio Ottenuto</span>
                    <div className="text-4xl font-black font-orbitron text-white text-shadow-neon-cyan">
                      +{gameState.score + (duelMode === 'blitz' ? 50 : 100)} {/* Bonus for win */}
                    </div>
                    <span className="text-[8px] text-slate-500 uppercase font-bold mt-1 block">Accumulati nel Profilo Globale</span>
                  </div>

                  <button onPointerDown={(e) => {
                    e.stopPropagation();
                    // Just reset local, match is already gone/cancelled if we are here (surrender screen)
                    resetDuelState();
                    setActiveModal('duel_selection');
                  }}
                    className="w-full bg-cyan-600 text-white py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all border border-cyan-400 hover:bg-cyan-500">
                    TORNA ALLA LOBBY
                  </button>
                </div>
              )}

              {gameState.status === 'level-complete' && (
                <div className="bg-slate-900/60 p-8 rounded-[2.5rem] text-center modal-content animate-screen-in w-full max-w-md mt-12 relative overflow-hidden border-[4px] border-[#FF8800] shadow-[0_40px_100px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
                  {/* Background Texture Removed */}

                  {gameState.isBossLevel ? (
                    // BOSS WIN SCREEN
                    <div className="relative z-10">
                      <Crown className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-bounce" />
                      <h2 className="text-4xl font-black font-orbitron text-yellow-400 mb-2 uppercase tracking-wider drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]">BOSS SCONFITTO!</h2>
                      <div className="text-xs font-bold text-white mb-6 uppercase tracking-[0.1em] bg-yellow-500/20 py-1 rounded">Dominio Matematico Stabilito</div>

                      <div className="bg-slate-900/60 p-5 rounded-2xl mb-6 border border-yellow-500/20">
                        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-2">Ricompensa</span>
                        <div className="text-3xl font-black font-orbitron text-white text-shadow-neon-yellow flex flex-col items-center gap-1">
                          <span>30s BONUS</span>
                          <span className="text-xs text-yellow-500 font-bold">+1000 PUNTI</span>
                        </div>
                      </div>

                      <button onPointerDown={async (e) => {
                        e.stopPropagation();
                        if (currentUser && gameState.bossLevelId) {
                          try {
                            const updatedProfile = await profileService.completeBoss(currentUser.id, gameState.bossLevelId);
                            if (updatedProfile) {
                              setUserProfile(updatedProfile); // Force immediate update
                            } else {
                              loadProfile(currentUser.id); // Fallback
                            }
                          } catch (err) {
                            console.error("Error saving boss victory:", err);
                          }
                        }
                        setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null, status: 'idle' }));
                      }}
                        className="w-full bg-yellow-600 text-white py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all border border-yellow-400 hover:bg-yellow-500">
                        RISCATTA & TORNA ALLA BASE
                      </button>
                    </div>
                  ) : (
                    // STANDARD LEVEL WIN
                    <div className="relative z-10">
                      <div className="flex justify-center items-center gap-6 mb-6">
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase font-black text-white/70 tracking-wider">Livello</span>
                          <span className="text-3xl font-black font-orbitron text-white">{gameState.level}</span>
                        </div>
                        <ChevronRight className="w-8 h-8 text-[#FF8800] animate-pulse" strokeWidth={3} />
                        <div className="flex flex-col items-center">
                          <span className="text-[9px] uppercase font-black text-[#FF8800] tracking-wider">Prossimo</span>
                          <span className="text-4xl font-black font-orbitron text-[#FF8800] drop-shadow-[0_0_10px_rgba(255,136,0,0.5)]">{gameState.level + 1}</span>
                        </div>
                      </div>

                      <div className="bg-black/30 p-5 rounded-2xl mb-6 border border-white/20 space-y-3">
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Punti Livello</span>
                          <span className="text-lg font-orbitron font-black text-[#FF8800] animate-pulse">
                            +{gameState.score > 0 ? (gameState.timeLeft * 2) + 50 + (10 * 5) : '...'}
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">Punteggio Totale</span>
                          <span className="text-lg font-orbitron font-black text-white">{gameState.totalScore}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <div className="bg-green-500/10 rounded-lg p-2 flex flex-col items-center">
                            <span className="text-[8px] font-black uppercase text-green-400 tracking-wider">Residuo</span>
                            <span className="text-sm font-orbitron font-black text-green-300">{gameState.timeLeft}s</span>
                          </div>
                          <div className="bg-green-500/20 rounded-lg p-2 flex flex-col items-center border border-green-500/30">
                            <span className="text-[8px] font-black uppercase text-green-300 tracking-wider">Totale</span>
                            <span className="text-sm font-orbitron font-black text-white">{gameState.timeLeft + 60}s</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <button onPointerDown={(e) => { e.stopPropagation(); nextLevel(); }}
                          className="w-full bg-gradient-to-r from-[#FF8800] to-[#FF5500] text-white py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-lg shadow-[0_8px_20px_rgba(255,136,0,0.4)] active:scale-95 transition-all flex items-center justify-center gap-2 border-[3px] border-white group relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                          <Play className="w-5 h-5 fill-current" />
                          <span className="relative z-10">Prossimo Livello</span>
                        </button>

                        <div className="grid grid-cols-2 gap-3">
                          <button onPointerDown={(e) => { e.stopPropagation(); startGame(gameState.level); }}
                            className="bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs active:scale-95 transition-all border border-slate-700 hover:text-white hover:bg-slate-700">
                            Rigioca
                          </button>
                          <button onPointerDown={(e) => {
                            e.stopPropagation();
                            resetDuelState(activeMatch?.id, currentUser?.id);
                            goToHome(e);
                            setGameState(prev => ({ ...prev, isBossLevel: false, bossLevelId: null }));
                          }}
                            className="bg-slate-800 text-slate-300 py-3 rounded-xl font-bold uppercase text-xs active:scale-95 transition-all border border-slate-700 hover:text-white hover:bg-slate-700">
                            Home
                          </button>
                        </div>

                        <button className="text-[9px] text-cyan-500/40 uppercase font-black tracking-[0.2em] hover:text-cyan-400 transition-colors pt-1 animate-pulse">
                          Salvataggio Automatico Attivo
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </main>
          </div >
        )}

        {
          activeModal === 'tutorial' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="bg-white border-[4px] border-[#FF8800] w-full max-w-md p-8 rounded-[2rem] shadow-[0_0_50px_rgba(255,136,0,0.3)] flex flex-col" onPointerDown={e => e.stopPropagation()}>
                <div className="flex flex-col items-center text-center py-4">
                  <div className="mb-6 scale-125 drop-shadow-sm">{TUTORIAL_STEPS[tutorialStep].icon}</div>
                  <h2 className="text-2xl font-black font-orbitron text-[#FF8800] mb-4 uppercase tracking-widest">{TUTORIAL_STEPS[tutorialStep].title}</h2>
                  <p className="text-slate-600 font-bold text-sm leading-relaxed mb-10 border-t-2 border-slate-100 pt-4 w-full">{TUTORIAL_STEPS[tutorialStep].description}</p>
                  <button onPointerDown={(e) => { e.stopPropagation(); nextTutorialStep(); }} className="w-full bg-[#FF8800] text-white border-[3px] border-white py-5 rounded-2xl font-orbitron font-black text-sm uppercase shadow-lg active:scale-95 transition-all outline-none ring-0">
                    {tutorialStep === TUTORIAL_STEPS.length - 1 ? 'HO CAPITO' : 'AVANTI'}
                  </button>
                </div>
              </div>
            </div>
          )
        }



        {/* MODE SELECTION MODAL */}
        {activeModal === 'duel_selection' && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80 backdrop-blur-sm" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
            <div className="bg-slate-900/90 border-[3px] border-red-500/50 w-full max-w-lg p-8 rounded-[2rem] shadow-[0_0_60px_rgba(239,68,68,0.4)] flex flex-col relative overflow-hidden backdrop-blur-xl" onPointerDown={e => e.stopPropagation()}>
              {/* Background Decor */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

              <h2 className="text-xl sm:text-3xl font-black font-orbitron text-white mb-2 uppercase text-center relative z-10 flex items-center justify-center gap-2 sm:gap-3">
                <Swords className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 animate-bounce" /> SELEZIONA SFIDA
              </h2>
              <p className="text-red-500 text-center text-[10px] sm:text-sm mb-4 sm:mb-8 font-orbitron font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] relative z-10 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse-slow">
                COMBATTI • VINCI • GLORIA
              </p>

              <div className="flex flex-col gap-3 relative z-10 w-full">
                {/* Option 1: STANDARD */}
                <button
                  className="w-full bg-gradient-to-r from-red-600 to-rose-700 p-4 rounded-xl flex items-center gap-4 border-2 border-white/10 hover:border-white/40 hover:scale-[1.02] active:scale-95 transition-all group shadow-lg relative overflow-hidden"
                  onPointerDown={() => { soundService.playUIClick(); setDuelMode('standard'); setActiveModal('duel'); }}
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-10">
                    <Swords size={22} className="text-yellow-300 drop-shadow-sm" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">STANDARD</h3>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">Velocità Pura • Partita Secca</p>
                  </div>
                  <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-10" />
                </button>

                {/* Option 2: BLITZ */}
                <button
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-600 p-4 rounded-xl flex items-center gap-4 border-2 border-white/10 hover:border-white/40 hover:scale-[1.02] active:scale-95 transition-all group shadow-lg relative overflow-hidden"
                  onPointerDown={() => { soundService.playUIClick(); setDuelMode('blitz'); setActiveModal('duel'); }}
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <div className="absolute top-0 right-12 bg-red-600 text-white text-[8px] font-black px-2 py-0.5 rounded-b-lg shadow-sm z-20">NEW</div>

                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-10">
                    <Zap size={22} className="text-white drop-shadow-sm" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">BLITZ DOMINION</h3>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">Alta Strategia • Conquista</p>
                  </div>
                  <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-10" />
                </button>

                {/* Option 3: TIME ATTACK */}
                <button
                  className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-xl flex items-center gap-4 border-2 border-white/10 hover:border-white/40 hover:scale-[1.02] active:scale-95 transition-all group shadow-lg relative overflow-hidden"
                  onPointerDown={() => { soundService.playUIClick(); setDuelMode('time_attack'); setActiveModal('duel'); }}
                >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
                  <div className="absolute top-0 right-12 bg-yellow-400 text-black text-[8px] font-black px-2 py-0.5 rounded-b-lg shadow-sm z-20 animate-pulse">HOT</div>

                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/20 group-hover:bg-white/20 transition-colors shadow-inner relative z-10">
                    <Clock size={22} className="text-white drop-shadow-sm" />
                  </div>
                  <div className="text-left flex-1 relative z-10">
                    <h3 className="font-orbitron font-black text-white text-lg uppercase leading-none mb-1 tracking-wider">TIME ATTACK</h3>
                    <p className="text-[10px] text-white/80 font-bold uppercase tracking-wide">60 Secondi • Target Infiniti</p>
                  </div>
                  <ChevronRight className="text-white/30 group-hover:text-white transition-colors relative z-10" />
                </button>
              </div>


            </div>
          </div>
        )}

        {/* BOSS SELECTION MODAL */}
        {activeModal === 'boss_selection' && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80 backdrop-blur-sm" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
            <div className="bg-slate-900/90 border-[3px] border-emerald-500/50 w-full max-w-2xl p-6 rounded-[2rem] shadow-[0_0_60px_rgba(16,185,129,0.4)] flex flex-col relative overflow-hidden h-[70vh] backdrop-blur-xl" onPointerDown={e => e.stopPropagation()}>
              {/* Background Decor */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
              <div className="absolute inset-0 bg-[url('/sfondo_green.png')] bg-cover bg-center opacity-30 pointer-events-none mix-blend-overlay"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-pulse"></div>

              <div className="relative z-10">
                <h2 className="text-xl sm:text-3xl font-black font-orbitron text-white mb-2 uppercase text-center flex items-center justify-center gap-2 sm:gap-3">
                  <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-300 animate-bounce" /> SFIDE BOSS
                </h2>
                <p className="text-emerald-400 text-center text-[10px] sm:text-sm mb-4 sm:mb-6 font-orbitron font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] drop-shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse-slow">
                  SFIDALI • VINCI • DOMINA
                </p>

                {/* Boss Grid */}
                <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[55vh] pr-2 custom-scroll">
                  {BOSS_LEVELS.map((boss) => {
                    const isDefeated = userProfile?.badges?.includes(boss.id === 1 ? 'boss_matematico' : `boss_${boss.id}_defeated`) || false;
                    const isUnlocked = (userProfile?.max_level || 1) >= boss.requiredLevel;
                    const canPlay = isUnlocked && !isDefeated;

                    return (
                      <div
                        key={boss.id}
                        className={`relative p-5 rounded-2xl border-2 transition-all overflow-hidden group
                            ${isDefeated
                            ? 'bg-slate-900 border-green-500/30'
                            : canPlay
                              ? 'bg-gradient-to-r from-emerald-900/60 to-teal-900/60 border-emerald-500/50 hover:border-emerald-400 hover:scale-[1.02] cursor-pointer shadow-lg hover:shadow-emerald-500/30'
                              : 'bg-slate-900/50 border-slate-700 opacity-50 grayscale cursor-not-allowed'
                          }
                          `}
                        onPointerDown={(e) => {
                          e.stopPropagation();
                          if (canPlay) {
                            soundService.playUIClick();
                            if (!currentUser) {
                              showToast('Accedi per sfidare il boss!');
                              setShowAuthModal(true);
                            } else {
                              startBossGame(boss.id);
                            }
                          } else if (isDefeated) {
                            soundService.playUIClick();
                            showToast('Dominio Boss stabilito: ricompensa già riscossa!');
                          } else {
                            soundService.playUIClick();
                            showToast(`Raggiungi il livello ${boss.requiredLevel} per sbloccare questo boss!`);
                          }
                        }}
                      >
                        {/* Background Pattern */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>

                        {/* Victory Overlay for Defeated Boss */}
                        {isDefeated && (
                          <div className="absolute inset-0 bg-green-500/5 pointer-events-none z-0"></div>
                        )}

                        {/* Victory Badge */}
                        {isDefeated && (
                          <div className="absolute top-3 right-3 z-30">
                            <div className="flex flex-col items-end gap-1">
                              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-400 to-green-600 border-4 border-white shadow-[0_0_20px_rgba(34,197,94,0.4)] flex items-center justify-center animate-pulse">
                                <Trophy className="w-6 h-6 text-white" strokeWidth={3} />
                              </div>
                              <span className="bg-green-500 text-white text-[7px] font-black px-2 py-0.5 rounded-full shadow-sm tracking-tighter uppercase">DOMINATO</span>
                            </div>
                          </div>
                        )}

                        {/* Lock Badge */}
                        {!isUnlocked && !isDefeated && (
                          <div className="absolute top-3 right-3 z-20">
                            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center">
                              <Lock className="w-6 h-6 text-slate-500" />
                            </div>
                          </div>
                        )}

                        <div className="relative z-10 flex items-start gap-4">
                          {/* Boss Icon */}
                          <div className={`w-16 h-16 rounded-xl flex items-center justify-center shrink-0 border-2 shadow-lg
                              ${isDefeated
                              ? 'bg-green-900/40 border-green-500/50'
                              : canPlay
                                ? 'bg-emerald-500/20 border-emerald-500/50'
                                : 'bg-slate-800 border-slate-700'
                            }
                            `}>
                            <Crown className={`w-6 h-6 sm:w-8 sm:h-8 ${isDefeated ? 'text-green-400' : canPlay ? 'text-yellow-300' : 'text-slate-600'}`} />
                          </div>

                          {/* Boss Info */}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded
                                  ${isDefeated
                                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                  : canPlay
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-slate-700/50 text-slate-500'
                                }
                                `}>
                                LIV. {boss.requiredLevel}
                              </span>
                              {isDefeated && (
                                <span className="text-[8px] font-black uppercase text-white bg-green-500 px-2 py-0.5 rounded-full animate-pulse shadow-sm">
                                  COMPLETATO
                                </span>
                              )}
                            </div>
                            <h3 className={`font-orbitron font-black text-sm sm:text-lg uppercase leading-none mb-2
                                ${isDefeated ? 'text-green-300' : 'text-white'}
                              `}>
                              {boss.title}
                            </h3>
                            <p className={`text-[10px] sm:text-xs mb-3 ${isDefeated ? 'text-slate-500 italic' : 'text-slate-400'}`}>
                              {isDefeated ? 'Operazione terminata: Intelligenza superiore confermata.' : boss.description}
                            </p>

                            {/* Stats */}
                            <div className="flex gap-3 text-[10px]">
                              <div className="flex items-center gap-1">
                                <Target className={`w-3 h-3 ${isDefeated ? 'text-green-600' : 'text-emerald-400'}`} />
                                <span className={`${isDefeated ? 'text-slate-600' : 'text-slate-300'} font-bold`}>{boss.targets} Target</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Timer className={`w-3 h-3 ${isDefeated ? 'text-green-600' : 'text-cyan-400'}`} />
                                <span className={`${isDefeated ? 'text-slate-600' : 'text-slate-300'} font-bold`}>{boss.time}s</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-yellow-500" />
                                <span className="text-yellow-400 font-bold">{isDefeated ? 'PREMIO RISCOSSO' : boss.reward}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Indicator */}
                          {canPlay && (
                            <ChevronRight className="w-6 h-6 text-emerald-400 group-hover:translate-x-1 transition-transform" />
                          )}

                          {isDefeated && (
                            <div className="flex items-center justify-center">
                              <Shield className="w-5 h-5 text-green-500/30 rotate-12" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => setActiveModal(null)}
                  className="mt-6 w-full text-slate-400 text-sm hover:text-white uppercase font-bold tracking-widest py-3 rounded-xl border border-slate-700 hover:border-slate-500 transition-all"
                >
                  Chiudi
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'registration_success' && (
          <RegistrationSuccess onEnter={() => setActiveModal(null)} />
        )}

        {activeModal === 'resume_confirm' && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-4 modal-overlay overflow-hidden" onPointerDown={() => setActiveModal(null)}>
            {/* Background Image Layer - Direct Visibility */}
            <div className="absolute inset-0 bg-[url('/sfondoblu.png')] bg-cover bg-center z-[-1] animate-pulse-slow"></div>

            <div className="bg-slate-900/60 border-[4px] border-[#FF8800] w-full max-w-md p-8 rounded-[2.5rem] shadow-[0_40px_100px_rgba(0,0,0,0.6)] flex flex-col relative overflow-hidden backdrop-blur-2xl" onPointerDown={e => e.stopPropagation()}>
              {/* Animated Background - Line Removed */}
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#FF8800] to-transparent animate-pulse"></div>

              {/* Header Icon - Hexagon Shape (like game cells) */}
              <div className="relative z-10 mb-6">
                <div className="w-24 h-24 mx-auto relative">
                  {/* Hexagon SVG Background */}
                  <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full drop-shadow-[0_0_20px_rgba(255,136,0,0.6)]">
                    <defs>
                      <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style={{ stopColor: '#FF8800', stopOpacity: 1 }} />
                        <stop offset="100%" style={{ stopColor: '#D97706', stopOpacity: 1 }} />
                      </linearGradient>
                    </defs>
                    <polygon
                      points="50,5 90,27.5 90,72.5 50,95 10,72.5 10,27.5"
                      fill="url(#hexGradient)"
                      stroke="#FFB347"
                      strokeWidth="2"
                      className="animate-pulse"
                    />
                  </svg>
                  {/* Play Icon Centered */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Play className="w-10 h-10 text-white drop-shadow-lg" fill="white" />
                  </div>
                </div>
              </div>

              {/* Title Removed as requested */}

              {/* Saved Game Info */}
              <div className="bg-black/30 border border-[#FF8800]/30 rounded-xl p-4 mb-6 relative z-10">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-white/60 font-black text-[9px] tracking-[0.15em] uppercase">{savedGame ? 'LIVELLO SALVATO' : 'LIVELLO INIZIALE'}</span>
                </div>
                <div className="text-8xl font-black font-orbitron text-[#FF8800] text-center drop-shadow-[0_0_30px_rgba(255,136,0,0.5)] animate-pulse-slow">
                  {savedGame?.level || 1}
                </div>

                {/* Detailed Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mt-4">
                  {/* Time Info - Now shows total available time */}
                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Timer className="w-3 h-3 text-blue-400" />
                      <span className="text-[10px] text-white uppercase font-bold">Tempo Totale</span>
                    </div>
                    <div className="text-lg font-black font-orbitron text-white text-center">
                      {(savedGame?.timeLeft || 0) + parseInt(localStorage.getItem('career_time_bonus') || '0')}s
                    </div>
                    {/* Breakdown if bonus exists */}
                    {parseInt(localStorage.getItem('career_time_bonus') || '0') > 0 && (
                      <div className="text-[9px] text-white/70 text-center mt-0.5">
                        ({savedGame?.timeLeft || 0}s + {localStorage.getItem('career_time_bonus')}s bonus)
                      </div>
                    )}
                  </div>

                  <div className="bg-black/20 rounded-lg p-2 border border-white/10">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className="w-3 h-3 text-amber-400" />
                      <span className="text-[10px] text-white uppercase font-bold">Punti</span>
                    </div>
                    <div className="text-lg font-black font-orbitron text-white text-center">
                      {savedGame?.totalScore || 0}
                    </div>
                  </div>
                </div>

                {/* Bonus Time Highlight (if exists) */}
                {parseInt(localStorage.getItem('career_time_bonus') || '0') > 0 && (
                  <div className="mt-3 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border border-amber-500/40 rounded-lg p-2.5">
                    <div className="flex items-center justify-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                      <span className="text-xs text-amber-300 font-bold">
                        BONUS BOSS ATTIVO: +{localStorage.getItem('career_time_bonus')}s
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 relative z-10">
                {/* Resume/Start Button */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); savedGame ? restoreGame() : startGame(); }}
                  className="w-full bg-gradient-to-r from-[#FF8800] to-orange-600 text-white py-4 px-6 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg shadow-[#FF8800]/30 active:scale-95 transition-all border-2 border-white/20 hover:shadow-[#FF8800]/50 flex items-center justify-center gap-3 group"
                >
                  <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  {savedGame ? 'RIPRENDI PARTITA' : 'INIZIA ORA'}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 py-2">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <span className="text-white text-[10px] font-bold uppercase tracking-widest">Opzioni Avanzate</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>

                {/* Full Reset Button */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); setActiveModal('full_reset_confirm'); }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl font-orbitron font-black uppercase tracking-widest text-xs border-2 border-white/20 shadow-lg shadow-red-900/40 active:scale-95 transition-all hover:from-red-500 hover:to-red-600 flex items-center justify-center gap-2 group"
                >
                  <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  RESET TOTALE
                </button>

                {/* Back Button */}
                <button
                  onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); setActiveModal(null); }}
                  className="w-full py-3 text-white/60 font-black uppercase text-xs tracking-[0.2em] hover:text-white transition-all flex items-center justify-center gap-2 group"
                >
                  <Home className="w-4 h-4 group-hover:scale-110 transition-transform" />
                  TORNA ALLA HOME
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULL RESET CONFIRMATION MODAL */}
        {activeModal === 'full_reset_confirm' && (
          <div className="fixed inset-0 z-[5001] flex items-center justify-center p-6 modal-overlay bg-black/95 backdrop-blur-lg" onPointerDown={() => setActiveModal('resume_confirm')}>
            <div className="bg-gradient-to-br from-red-950 via-red-900 to-red-950 border-[3px] border-red-500 w-full max-w-md p-8 rounded-[2rem] shadow-[0_0_80px_rgba(239,68,68,0.6)] flex flex-col relative overflow-hidden animate-pulse" onPointerDown={e => e.stopPropagation()}>
              {/* Animated Warning Background */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse"></div>

              {/* Warning Icon */}
              <div className="relative z-10 mb-6">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-red-600 to-red-800 rounded-full flex items-center justify-center shadow-lg shadow-red-500/50 animate-pulse border-4 border-red-400">
                  <AlertTriangle className="w-14 h-14 text-white" strokeWidth={3} />
                </div>
              </div>

              {/* Title */}
              <h2 className="text-3xl font-black font-orbitron text-white mb-3 uppercase tracking-wider relative z-10 text-center">
                ⚠️ ATTENZIONE ⚠️
              </h2>

              {/* Warning Message */}
              <div className="bg-black/40 border-2 border-red-500/50 rounded-xl p-5 mb-6 relative z-10">
                <p className="text-white font-bold text-center mb-4 leading-relaxed">
                  Stai per <span className="text-red-400 font-black">CANCELLARE TUTTO</span>:
                </p>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span>Tutti i livelli completati</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span>Tutti i badge e medaglie</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span>Boss sconfitti e bonus</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span>Statistiche duelli</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <X className="w-4 h-4 text-red-400" />
                    <span>Punteggi e QI stimato</span>
                  </div>
                </div>
                <p className="text-red-400 font-black text-center mt-4 text-xs uppercase tracking-wider">
                  Questa azione è IRREVERSIBILE!
                </p>
              </div>

              {/* Confirmation Buttons */}
              <div className="space-y-3 relative z-10">
                <button
                  onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); localStorage.setItem('career_time_bonus', '0'); handleFullReset(); }}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-4 px-6 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg shadow-red-500/50 active:scale-95 transition-all border-2 border-white/30 hover:shadow-red-500/70 flex items-center justify-center gap-3 group"
                >
                  <AlertTriangle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  SÌ, CANCELLA TUTTO
                </button>

                <button
                  onPointerDown={(e) => { e.stopPropagation(); soundService.playUIClick(); setActiveModal('resume_confirm'); }}
                  className="w-full bg-gradient-to-r from-slate-700 to-slate-800 text-white py-3 px-6 rounded-xl font-orbitron font-bold uppercase tracking-widest text-xs border-2 border-white/20 active:scale-95 transition-all hover:from-slate-600 hover:to-slate-700 flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  NO, TORNA INDIETRO
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'logout_confirm' && (
          <div className="fixed inset-0 z-[5000] flex items-center justify-center p-6 modal-overlay bg-black/90 backdrop-blur-md" onPointerDown={() => setActiveModal(null)}>
            <div className="bg-slate-900 border-[3px] border-red-500/50 w-full max-w-sm p-8 rounded-[2rem] shadow-[0_0_50px_rgba(220,38,38,0.4)] flex flex-col text-center relative overflow-hidden" onPointerDown={e => e.stopPropagation()}>
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>

              <User className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-black font-orbitron text-white mb-2 uppercase tracking-wider relative z-10">LOGOUT</h2>
              <p className="text-slate-400 font-bold text-sm mb-8 relative z-10">
                Vuoi davvero disconnetterti?
              </p>

              <div className="space-y-3 relative z-10">
                <button
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    import('./services/supabaseClient').then(({ authService }) => authService.signOut());
                    setCurrentUser(null);
                    setUserProfile(null);
                    resetDuelState();
                    setGameState(prev => ({ ...prev, status: 'idle' }));
                    showToast(`Logout effettuato.`);
                    setActiveModal(null);
                  }}
                  className="w-full bg-red-600 text-white py-4 rounded-xl font-orbitron font-black uppercase tracking-widest text-sm shadow-lg active:scale-95 transition-all border-2 border-white"
                >
                  CONFERMA USCITA
                </button>
                <button
                  onPointerDown={(e) => { e.stopPropagation(); setActiveModal(null); }}
                  className="w-full bg-slate-800 text-slate-400 py-3 rounded-xl font-orbitron font-black uppercase tracking-widest text-xs border border-slate-600 active:scale-95 transition-all hover:text-white"
                >
                  ANNULLA
                </button>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'duel' && currentUser && (
          <NeuralDuelLobby
            currentUser={currentUser}
            userProfile={userProfile}
            mode={duelMode}
            showToast={showToast}
            onlinePlayers={onlinePlayers}
            onClose={() => setActiveModal('duel_selection')}
            onMatchStart={(seed, matchId, opponentId, isP1) => {
              setActiveModal(null);

              // Check if I am P1 by fetching match from matches state or just check if matchId was hosted by me
              // Simplified: The lobby component knows, or we just rely on latest match data sync.
              // Better: neuralDuelLobby already knows, but let's just use current user logic.
              setActiveMatch({ id: matchId, opponentId, isDuel: true, isP1: isP1 }); // Placeholder, fix in effect

              // Initialize Duel Game
              soundService.playUIClick();
              setGameState(prev => ({
                ...prev,
                score: 0,
                totalScore: prev.totalScore, // Preserve points during duel
                streak: 0,
                level: 1,
                timeLeft: duelMode === 'time_attack' ? 60 : INITIAL_TIME,
                targetResult: 0,
                status: 'playing',
                estimatedIQ: prev.estimatedIQ,
                lastLevelPerfect: true,
                basePoints: BASE_POINTS_START,
                levelTargets: [],
              }));
              // Pass the MATCH SEED to create the exact same board for both players
              generateGrid(1, seed);
              // Reset Opponent Score
              setOpponentScore(0);
              // Clean ready status just in case
              matchService.resetRoundStatus(matchId);
            }}
          />
        )}

        {
          activeModal === 'leaderboard' && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 modal-overlay bg-black/80" onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }}>
              <div className="glass-panel w-full max-w-md p-6 rounded-[2rem] modal-content flex flex-col h-[70vh]" onPointerDown={e => e.stopPropagation()}>
                <h2 className="text-2xl font-black font-orbitron text-white mb-4 uppercase flex items-center gap-3"><Award className="text-amber-400" /> CLASSIFICHE</h2>

                {/* Leaderboard Tabs */}
                <div className="flex bg-white/10 rounded-xl p-1 mb-4">
                  <button
                    onClick={() => setTutorialStep(0)} // Using tutorialStep variable as a hack for tab index or just create a new local state wrapper... 
                    // Actually, let's just assume we view SCORE by default, or better:
                    // Since I can't easily add state here without full re-write, I'll use a local var logic or verify if I can edit state.
                    // I will check if I can modify App state higher up. I see 'tutorialStep'.
                    // I'll create a simple toggle inside the render using a new state variable is simpler if I could...
                    // Let's use `scoreAnimKey` as a toggle for tabs? No that's dirty.
                    // I'll stick to a simple internal toggle using `tutorialStep` (since it's unused in this modal) 
                    // 0 = Score, 1 = Level.
                    onPointerDown={() => setTutorialStep(0)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${tutorialStep === 0 ? 'bg-[#FF8800] text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Punteggio
                  </button>
                  <button
                    onPointerDown={() => setTutorialStep(1)}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs uppercase transition-all ${tutorialStep === 1 ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                  >
                    Livello Max
                  </button>
                </div>

                {(!leaderboardData || (!leaderboardData['byScore'] && !Array.isArray(leaderboardData))) ? (
                  <div className="text-center py-10 text-slate-400 font-orbitron">Caricamento...</div>
                ) : (
                  <div className="space-y-3 overflow-y-auto flex-1 pr-2 custom-scroll">
                    {/* DATA LIST */}
                    {((tutorialStep === 0 ? (leaderboardData as any).byScore : (leaderboardData as any).byLevel) || []).map((p: any, idx: number) => {
                      // Rank Calculation Inline for Leaderboard (avoiding circular dependency or extra imports if possible, but we imported `getRank` so use it)
                      const playerRank = getRank(p.max_level || 1);
                      const RankIcon = playerRank.icon;

                      return (
                        <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 relative overflow-hidden group">
                          {/* Top 3 Highlight */}
                          {idx < 3 && <div className={`absolute left-0 top-0 bottom-0 w-1 ${idx === 0 ? 'bg-[#FFD700]' : idx === 1 ? 'bg-gray-300' : 'bg-[#CD7F32]'}`}></div>}

                          <div className="flex items-center gap-3 pl-2">
                            {/* Avatar or Placeholder */}
                            <div className="w-9 h-9 min-w-[36px] min-h-[36px] rounded-full bg-slate-800 border-2 border-white/10 overflow-hidden flex items-center justify-center">
                              {p.avatar_url ? (
                                <img src={p.avatar_url} className="w-full h-full object-cover" alt={p.username} />
                              ) : (
                                <span className="text-xs font-bold text-slate-500">{p.username?.charAt(0) || '?'}</span>
                              )}
                            </div>

                            <div className="flex flex-col">
                              <span className={`text-sm font-bold leading-tight ${idx < 3 ? 'text-white' : 'text-gray-300'}`}>
                                {idx + 1}. {p.username || 'Giocatore'}
                              </span>

                              <div className="flex items-center gap-1 mt-0.5">
                                {idx === 0 && <Sparkles size={10} className="text-yellow-400" />}
                                <RankIcon size={10} className={playerRank.color} />
                                <span className={`text-[8px] uppercase font-black tracking-widest ${playerRank.color}`}>{playerRank.title}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            {tutorialStep === 0 ? (
                              <>
                                <span className="font-orbitron font-black text-[#FF8800] text-sm">{p.total_score} pts</span>
                                <span className="font-orbitron font-bold text-gray-500 text-[9px]">Liv {p.max_level}</span>
                              </>
                            ) : (
                              <>
                                <span className="font-orbitron font-black text-cyan-400 text-sm">Liv {p.max_level}</span>
                                <span className="font-orbitron font-bold text-gray-500 text-[9px]">{p.total_score} pts</span>
                              </>
                            )}

                          </div>
                        </div>
                      )
                    })}

                    {((tutorialStep === 0 ? (leaderboardData as any).byScore : (leaderboardData as any).byLevel) || []).length === 0 && (
                      <div className="text-center py-8 text-gray-500 text-xs">Nessun dato disponibile</div>
                    )}
                  </div>
                )}

                <button onPointerDown={() => { soundService.playUIClick(); setActiveModal(null); }} className="mt-4 w-full bg-slate-800 text-white py-4 rounded-xl font-orbitron font-black text-xs uppercase active:scale-95 transition-all">CHIUDI</button>
              </div>
            </div>
          )
        }

        {activeModal === 'admin' && <AdminPanel onClose={() => setActiveModal(null)} />}

        {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={handleLoginSuccess} />}

        {activeModal === 'profile' && (
          <UserProfileModal
            currentUser={currentUser}
            userProfile={userProfile}
            onClose={() => setActiveModal(null)}
            onUpdate={(newP) => setUserProfile(newP)}
          />
        )}

        {/* DUEL RECAP MODAL */}
        {/* DUEL RECAP MODAL */}
        {showDuelRecap && latestMatchData && !showVideo && !showLostVideo && !showSurrenderVideo && (
          <DuelRecapModal
            matchData={latestMatchData}
            currentUser={currentUser}
            isWinnerProp={
              latestMatchData.winner_id
                ? latestMatchData.winner_id === currentUser?.id
                : (latestMatchData.mode === 'blitz'
                  ? ( // BLITZ LOGIC: Targets > Points
                    // Calculate my targets (pX_rounds) vs opp targets
                    (() => {
                      const isP1 = latestMatchData.player1_id === currentUser?.id;
                      const myTargets = isP1 ? latestMatchData.p1_rounds : latestMatchData.p2_rounds;
                      const oppTargets = isP1 ? latestMatchData.p2_rounds : latestMatchData.p1_rounds;
                      const myPoints = gameState.score;
                      const oppPoints = opponentScore;

                      if (myTargets > oppTargets) return true;
                      if (oppTargets > myTargets) return false;
                      // Tie on Targets -> Check Points
                      return myPoints > oppPoints;
                    })()
                  )
                  : (gameState.score > opponentScore) // Standard/TimeAttack
                )
            }
            myScore={gameState.score}
            opponentScore={opponentScore}
            isFinal={latestMatchData.status === 'finished'}
            onReady={() => { }}
            onExit={goToDuelLobby}
          />
        )}

        <footer className="mt-auto py-6 text-slate-600 text-slate-600 text-[8px] tracking-[0.4em] uppercase font-black z-10 pointer-events-none opacity-0">AI Evaluation Engine v3.6 - LOCAL DEV</footer>

        {/* HOMEPAGE TUTORIAL OVERLAY */}
        <ComicTutorial
          isVisible={showHomeTutorial}
          steps={[
            {
              targetId: 'audio-btn-home',
              title: 'AUDIO IMMERSIVO',
              description: 'Clicca qui per attivare o disattivare il suono. Per un\'esperienza ottimale, ti consigliamo di tenerlo acceso!',
              position: 'top'
            },
            {
              targetId: currentUser ? 'user-profile-home' : 'login-btn-home',
              title: currentUser ? 'PROFILO & STATS' : 'ACCEDI ORA',
              description: currentUser
                ? 'Qui puoi vedere il tuo punteggio totale e gestire il tuo account.'
                : 'Registrati per salvare i progressi, scalare le classifiche e sfidare altri giocatori!',
              position: 'top'
            },
            {
              targetId: 'logo-home',
              title: 'IL TUO HUB',
              description: 'Clicca sul logo NUMBER per accedere al tuo Profilo Completo, vedere i Badge sbloccati e i Trofei!',
              position: 'bottom'
            },
            {
              targetId: 'tutorial-btn-home',
              title: 'GUIDA AI COMANDI',
              description: 'Se hai dubbi su come giocare, clicca qui per rivedere le regole base.',
              position: 'bottom'
            },
            {
              targetId: 'play-btn-home',
              title: 'INIZIA L\'AVVENTURA',
              description: 'Pronto a mettere alla prova i tuoi neuroni? Clicca qui per avviare la modalità Classica.',
              position: 'center'
            },
            {
              targetId: 'duel-btn-home',
              title: 'SFIDE 1VS1',
              description: 'Entra nell\'arena! Sfida altri utenti in tempo reale in duelli di velocità matematica.',
              position: 'bottom'
            },
            {
              targetId: 'ranking-btn-home',
              title: 'CLASSIFICA GLOBALE',
              description: 'Controlla la tua posizione nel mondo. Diventerai il numero 1?',
              position: 'bottom'
            }
          ]}
          onComplete={(neverShow) => {
            setShowHomeTutorial(false);
            if (neverShow) localStorage.setItem('comic_home_tutorial_done', 'true');
          }}
          onSkip={(neverShow) => {
            setShowHomeTutorial(false);
            if (neverShow) localStorage.setItem('comic_home_tutorial_done', 'true');
          }}
        />

        {/* GAME TUTORIAL OVERLAY */}
        <ComicTutorial
          isVisible={showGameTutorial}
          steps={[
            {
              targetId: 'targets-display-tutorial',
              title: 'I TUOI OBIETTIVI',
              description: 'Questi sono i numeri che devi ottenere. Trova le combinazioni nella griglia per raggiungerli tutti!',
              position: 'top'
            },
            {
              targetId: 'grid-container-game',
              title: 'LA GRIGLIA',
              description: 'Collega le celle: NUMERO -> OPERATORE -> NUMERO.  Esempio: 5 + 3.  Non puoi collegare due numeri vicini senza operatore!',
              position: 'center'
            },
            {
              targetId: 'score-display-game',
              title: 'PUNTEGGIO',
              description: 'Più sei veloce e mantieni la streak (serie di risposte corrette), più punti farai. Punta al record!',
              position: 'right'
            },
            {
              targetId: 'timer-display-game',
              title: 'TEMPO & PAUSA',
              description: 'Hai poco tempo! Se ti serve respirare, clicca qui per mettere in PAUSA il sistema.',
              position: 'center'
            }
          ]}
          onComplete={(neverShow) => {
            setShowGameTutorial(false);
            if (neverShow) localStorage.setItem('comic_game_tutorial_done', 'true');
          }}
          onSkip={(neverShow) => {
            setShowGameTutorial(false);
            if (neverShow) localStorage.setItem('comic_game_tutorial_done', 'true');
          }}
        />

      </div >
    </>
  );
};

export default App;
