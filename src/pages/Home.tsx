import { App } from "@capacitor/app";
import {
  IonBadge,
  IonButton,
  IonCard,
  IonChip,
  IonContent,
  IonIcon,
  IonPage,
  IonPopover,
} from "@ionic/react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  alertCircleOutline,
  closeCircleOutline,
  exitOutline,
  homeOutline,
  informationCircleOutline,
  pauseCircleOutline,
  playCircleOutline,
  refresh,
  time,
} from "ionicons/icons";
import PuzzleBoard from "../components/PuzzleBoard";
import "./Home.css";

type Difficulty = "basic" | "intermediate" | "advanced";

export interface PlayProps {
  difficulty?: Difficulty;
}

type RompecabezasRuntimeConfig = {
  nivel?: string;
  imagen?: string;
  imagenes?: string[];
  autor?: string;
  version?: string;
  fecha?: string;
  descripcion?: string;
  nombreApp?: string;
  plataformas?: string[];
};

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
};

const EJERCICIOS_POR_DIFICULTAD: Record<Difficulty, number> = {
  basic: 2,
  intermediate: 4,
  advanced: 6,
};

const TIEMPO_POR_DIFICULTAD: Record<Difficulty, number> = {
  basic: 120,
  intermediate: 300,
  advanced: 600,
};

const PUNTOS_POR_DIFICULTAD: Record<Difficulty, number> = {
  basic: 10,
  intermediate: 15,
  advanced: 20,
};

const Home: React.FC<PlayProps> = ({ difficulty = "basic" }) => {
  const [showStartScreen, setShowStartScreen] = useState<boolean>(true);
  const [appNombreJuego, setAppNombreJuego] = useState<string>("STEAM-G");
  const [difficultyConfig, setDifficultyConfig] =
    useState<Difficulty>(difficulty);
  const [showInformation, setShowInformation] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(5);
  const [showCountdown, setShowCountdown] = useState<boolean>(false);
  const [appDescripcion, setAppDescripcion] = useState<string>(
    "Juego para el desarrollo de habilidades matemÃ¡ticas",
  );
  const [appFecha, setAppFecha] = useState<string>("2 de Diciembre del 2025");
  const [appVersion, setAppVersion] = useState<string>("1.0");
  const [appPlataformas, setAppPlataformas] = useState<string>("android");
  const [appAutor, setAppAutor] = useState<string>("Valeria C. Z.");
  const [showInstructions, setShowInstructions] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const [pausado, setPausado] = useState<boolean>(false);
  const [activeButtonIndex, setActiveButtonIndex] = useState<number | null>(
    null,
  );
  const [isComplete, setisComplete] = useState<boolean>(true);
  const [score, setScore] = useState<number>(0);
  const [maxScore, setMaxScore] = useState<number>(0);
  const [tiempoRestante, setTiempoRestante] = useState(0);
  const [puntuacionTotal, setPuntuacionTotal] = useState(0);
  const [currentExercise, setCurrentExercise] = useState(1);
  const [showKeepTrying, setShowKeepTrying] = useState<boolean>(false);
  const [showCongrats, setShowCongrats] = useState<boolean>(false);
  const [isPuzzleCompleted, setIsPuzzleCompleted] = useState<boolean>(false);
  const [imagenRompecabezas, setImagenRompecabezas] = useState<string | undefined>(undefined);

  const numExercises = EJERCICIOS_POR_DIFICULTAD[difficultyConfig];
  const currentExerciseRef = useRef(currentExercise);
  const timeoutHandledRef = useRef(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const res = await fetch("/config/rompecabezas-config.json");

        if (!res.ok) {
          return;
        }

        const data: RompecabezasRuntimeConfig = await res.json();

        if (data.nivel) {
          setDifficultyConfig(normalizarNivelConfig(data.nivel));
        }

        const imagenesConfig = obtenerImagenesConfig(data);
        if (imagenesConfig.length > 0) {
          setImagenRompecabezas(imagenesConfig[0]);
        }

        if (data.autor) setAppAutor(data.autor);
        if (data.version) setAppVersion(data.version);
        if (data.fecha) setAppFecha(formatearFechaLarga(data.fecha));
        if (data.descripcion) setAppDescripcion(data.descripcion);
        if (data.plataformas) setAppPlataformas(data.plataformas.join(", "));
        if (data.nombreApp) setAppNombreJuego(data.nombreApp);
      } catch (err) {
        console.error("No se pudo cargar rompecabezas-config.json", err);
      }
    };

    cargarConfig();
  }, []);

  useEffect(() => {
    if (showCountdown && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (showCountdown && countdown === 0) {
      setTimeout(() => {
        setShowCountdown(false);
      }, 500);
    }
  }, [countdown, showCountdown]);

  useEffect(() => {
    currentExerciseRef.current = currentExercise;
  }, [currentExercise]);

  useEffect(() => {
    const shouldPause =
      showStartScreen ||
      showCountdown ||
      pausado ||
      isPuzzleCompleted ||
      showSummary ||
      showFeedback ||
      showKeepTrying ||
      showCongrats ||
      countdown > 0;

    if (shouldPause) return;
    if (tiempoRestante <= 0) return;

    const timer = setTimeout(() => {
      setTiempoRestante((prev) => {
        if (prev <= 0) return 0;

        const newTime = prev - 1;

        if (newTime === 0 && !timeoutHandledRef.current) {
          timeoutHandledRef.current = true;
        }
        return newTime;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    showStartScreen,
    showCountdown,
    pausado,
    isPuzzleCompleted,
    showSummary,
    showFeedback,
    showKeepTrying,
    showCongrats,
    countdown,
    tiempoRestante,
    numExercises,
    difficultyConfig,
  ]);

  useEffect(() => {
    const shouldShowSummary =
      !showStartScreen &&
      !showCountdown &&
      !isPuzzleCompleted &&
      countdown === 0 &&
      tiempoRestante === 0 &&
      timeoutHandledRef.current;

    if (!shouldShowSummary || showSummary) {
      return;
    }

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setShowFeedback(false);
    setShowKeepTrying(false);
    setShowCongrats(false);
    setShowInstructions(false);
    setPausado(false);
    setShowSummary(true);
  }, [
    countdown,
    showCountdown,
    showStartScreen,
    isPuzzleCompleted,
    showSummary,
    tiempoRestante,
  ]);

  useEffect(() => {
    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  const getDifficultyLabel = (nivel: Difficulty): string => {
    const labels: Record<Difficulty, string> = {
      basic: "Básico",
      intermediate: "Intermedio",
      advanced: "Avanzado",
    };
    return labels[nivel] ?? nivel;
  };

  const generarConfeti = (cantidad = 60): ConfettiPiece[] => {
    const colores = ["#ff6b6b", "#feca57", "#48dbfb", "#1dd1a1", "#5f27cd"];

    return Array.from({ length: cantidad }, (_, id) => ({
      id,
      left: Math.random() * 100,
      delay: Math.random() * 1.5,
      duration: 2.5 + Math.random() * 2.5,
      color: colores[Math.floor(Math.random() * colores.length)],
    }));
  };

  const formatPlataforma = (texto: string): string => {
    const mapa: Record<string, string> = {
      android: "Android",
      ios: "iOS",
      web: "Web",
    };
    return texto
      .split(/,\s*/)
      .map(
        (p) => mapa[p.toLowerCase()] ?? p.charAt(0).toUpperCase() + p.slice(1),
      )
      .join(", ");
  };

  const normalizarNivelConfig = (nivel: string): Difficulty => {
    const limpio = nivel.toLowerCase();
    const mapa: Record<string, Difficulty> = {
      basico: "basic",
      basic: "basic",
      intermedio: "intermediate",
      intermediate: "intermediate",
      avanzado: "advanced",
      advanced: "advanced",
    };
    return mapa[limpio] ?? "basic";
  };

  const obtenerImagenesConfig = (config: RompecabezasRuntimeConfig) => {
    if (config.imagenes && config.imagenes.length > 0) {
      return config.imagenes;
    }

    if (config.imagen) {
      return [config.imagen];
    }

    return [];
  };

  const formatearFechaLarga = (isoDate?: string) => {
    if (!isoDate) return appFecha;
    const [year, month, day] = isoDate.split("-");
    const meses = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ];

    const mesIndex = Number(month) - 1;
    if (mesIndex < 0 || mesIndex > 11) return isoDate;

    return `${Number(day)} de ${meses[mesIndex]} del ${year}`;
  };

  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.max(0, segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, "0")}`;
  };

  const handleSalirDesdePausa = () => {
    setPausado(false);
    handleExitToStart();
  };

  const handleExitApp = async () => {
    try {
      await App.exitApp();
    } catch (e) {
      window.close();
    }
  };

  const handleStartGame = () => {
    setShowStartScreen(false);
    resetGame();
  };

  const handleInformation = () => {
    setShowInformation(!showInformation);
  };

  const handlePausar = () => {
    if (
      showStartScreen ||
      showCountdown ||
      showSummary ||
      showInstructions ||
      showFeedback ||
      pausado
    )
      return;

    setPausado(true);
  };

  const handleResume = () => {
    setPausado(false);
  };

  const handleExitToStart = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    setPausado(false);
    setIsPuzzleCompleted(false);

    setShowCountdown(false);
    setShowInstructions(false);
    setShowSummary(false);
    setShowFeedback(false);
    setShowKeepTrying(false);
    setShowCongrats(false);

    setShowStartScreen(true);
  };

  const handlePuzzleSolved = useCallback(() => {
    if (showSummary || isPuzzleCompleted) {
      return;
    }

    const earnedPoints = PUNTOS_POR_DIFICULTAD[difficultyConfig];

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    setIsPuzzleCompleted(true);
    setPausado(false);
    setShowFeedback(false);
    setShowKeepTrying(false);
    setShowCongrats(false);
    setShowInstructions(false);
    setScore(earnedPoints);
    setPuntuacionTotal(earnedPoints);
    setMaxScore(earnedPoints);

    transitionTimeoutRef.current = setTimeout(() => {
      setShowSummary(true);
      transitionTimeoutRef.current = null;
    }, 3000);
  }, [difficultyConfig, isPuzzleCompleted, showSummary]);

  const resetGame = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
      transitionTimeoutRef.current = null;
    }

    const targetScore = PUNTOS_POR_DIFICULTAD[difficultyConfig];

    setCountdown(5);
    setShowCountdown(true);
    setActiveButtonIndex(null);
    setisComplete(true);
    setScore(0);
    setMaxScore(targetScore);
    setPuntuacionTotal(0);
    setTiempoRestante(TIEMPO_POR_DIFICULTAD[difficultyConfig]);
    setCurrentExercise(1);
    setShowSummary(false);
    setShowFeedback(false);
    setShowKeepTrying(false);
    setShowCongrats(false);
    setPausado(false);
    setIsPuzzleCompleted(false);
    timeoutHandledRef.current = false;
  };

  return (
    <IonPage>
      {showCountdown && countdown > 0 && (
        <div className="countdown-overlay">
          <div className="countdown-number">{countdown}</div>
        </div>
      )}

      {showKeepTrying && (
        <div className="keep-trying-overlay">
          <div className="keep-trying-content">
            <div className="keep-trying-emoji">💪</div>
            <div className="keep-trying-text">¡Sigue intentando!</div>
          </div>
        </div>
      )}

      {showCongrats && (
        <div className="congrats-overlay">
          <div className="congrats-content">
            <div className="congrats-emoji">🥳</div>
            <div className="congrats-text">¡Felicidades!</div>
            <div className="congrats-points">
              +{PUNTOS_POR_DIFICULTAD[difficultyConfig]} puntos
            </div>
          </div>
          <div className="confetti-container">
            {generarConfeti().map((c) => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showSummary && (
        <div className="summary-overlay">
          <div className="summary-message">
            {(() => {
              const total = 0;
              const correctas = 0;
              const porcentaje =
                total > 0 ? Math.round((correctas / total) * 100) : 0;
              const etiqueta =
                correctas === total
                  ? "¡PERFECTO! 🤩"
                  : porcentaje >= 70
                    ? "¡Excelente! 💪"
                    : porcentaje >= 50
                      ? "¡Buen trabajo! 🥳"
                      : "¡Sigue practicando! 🤗";

              return (
                <>
                  <h2>Juego Terminado</h2>

                  <div className="resumen-final">
                    <h3>Resultados Finales</h3>
                    <p>
                      <strong>Puntuación total:</strong> {score} / {maxScore}
                    </p>

                    <IonBadge className="badge">{etiqueta}</IonBadge>
                  </div>

                  <IonButton
                    id="finalize"
                    expand="block"
                    onClick={handleSalirDesdePausa}
                  >
                    <IonIcon icon={refresh} slot="start" />
                    Jugar de Nuevo
                  </IonButton>

                  <IonButton id="exit" expand="block" onClick={handleExitApp}>
                    <IonIcon slot="start" icon={exitOutline}></IonIcon>
                    Cerrar aplicación
                  </IonButton>
                </>
              );
            })()}
          </div>

          <div className="confetti-container">
            {generarConfeti().map((c) => (
              <div
                key={c.id}
                className="confetti"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  backgroundColor: c.color,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {showInstructions && (
        <div className="ins-overlay" onClick={() => setShowInstructions(false)}>
          <div className="ins-card" onClick={(e) => e.stopPropagation()}>
            <div className="ins-title">
              <h2
                style={{ margin: 0, fontWeight: "bold", color: "var(--dark)" }}
              >
                Reglas Básicas
              </h2>
              <IonIcon
                icon={closeCircleOutline}
                style={{ fontSize: "26px", color: "var(--dark)" }}
                onClick={() => setShowInstructions(false)}
              />
            </div>

            <div className="ins-stats">
              <p style={{ textAlign: "justify" }}>
                <strong>
                  Coloca las piezas correctamente para formar la imagen.
                </strong>
              </p>
            </div>
          </div>
        </div>
      )}

      {showInformation && (
        <div className="info-modal-background">
          <div className="info-modal">
            <div className="header">
              <h2 style={{ color: "var(--color-primary)", fontWeight: "bold" }}>
                {appNombreJuego}
              </h2>
              <p
                style={{
                  color: "#8b8b8bff",
                  marginTop: "5px",
                  textAlign: "center",
                }}
              >
                Actividad configurada desde la plataforma Steam-G
              </p>
            </div>
            <div className="cards-info">
              <div className="card">
                <p className="title">VERSIÓN</p>
                <p className="data">{appVersion}</p>
              </div>
              <div className="card">
                <p className="title">FECHA DE CREACIÓN</p>
                <p className="data">{appFecha}</p>
              </div>
              <div className="card">
                <p className="title">PLATAFORMAS</p>
                <p className="data">{formatPlataforma(appPlataformas)}</p>
              </div>
              <div className="card">
                <p className="title">NÚMERO DE EJERCICIOS</p>
                <p className="data">{numExercises}</p>
              </div>
              <div className="card description">
                <p className="title">DESCRIPCIÓN</p>
                <p className="data">{appDescripcion}</p>
              </div>
            </div>
            <div className="button">
              <IonButton expand="full" onClick={handleInformation}>
                Cerrar
              </IonButton>
            </div>
          </div>
        </div>
      )}

      {pausado && (
        <div className="pause-overlay">
          <div className="pause-card">
            <h2>Juego en pausa</h2>
            <p>El tiempo está detenido.</p>

            <IonButton
              expand="block"
              id="resume"
              style={{ marginTop: "16px" }}
              onClick={handleResume}
            >
              <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
              Reanudar
            </IonButton>

            <IonButton
              expand="block"
              id="finalize"
              style={{ marginTop: "10px" }}
              onClick={handleSalirDesdePausa}
            >
              <IonIcon slot="start" icon={homeOutline}></IonIcon>
              Finalizar juego
            </IonButton>

            <IonButton
              expand="block"
              id="exit"
              style={{ marginTop: "10px" }}
              onClick={handleExitApp}
            >
              <IonIcon slot="start" icon={exitOutline}></IonIcon>
              Cerrar aplicación
            </IonButton>
          </div>
        </div>
      )}

      <IonContent fullscreen className="ion-padding">
        {showStartScreen ? (
          <div className="inicio-container">
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles start-page">
                  <h1>{appNombreJuego}</h1>
                </div>
              </div>
            </div>

            <div className="info-juego">
              <div className="info-item">
                <IonChip>
                  <strong>Nivel: {getDifficultyLabel(difficultyConfig)}</strong>
                </IonChip>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
              }}
              className="page-start-btns"
            >
              <IonButton onClick={handleStartGame} className="play">
                <IonIcon slot="start" icon={playCircleOutline}></IonIcon>
                Iniciar juego
              </IonButton>
              <IonButton onClick={handleInformation} className="info">
                <IonIcon slot="start" icon={informationCircleOutline}></IonIcon>
                Información
              </IonButton>
            </div>
          </div>
        ) : (
          <>
            <div className="header-game ion-no-border">
              <div className="toolbar-game">
                <div className="titles">
                  <h1>STEAM-G</h1>
                  <IonIcon
                    icon={alertCircleOutline}
                    size="small"
                    id="info-icon"
                  />
                  <IonPopover
                    trigger="info-icon"
                    side="bottom"
                    alignment="center"
                  >
                    <IonCard className="filter-card ion-no-margin">
                      <div className="section header-section">
                        <h2>{appNombreJuego}</h2>
                      </div>

                      <div className="section description-section">
                        <p>{appDescripcion}</p>
                      </div>

                      <div className="section footer-section">
                        <span>{appFecha}</span>
                      </div>
                    </IonCard>
                  </IonPopover>
                </div>
                <span>
                  <strong>{appNombreJuego}</strong>
                </span>
              </div>
            </div>

            <div className="instructions-exercises">
              <div className="num-words">
                <div
                  className="num-words rules"
                  onClick={() => setShowInstructions(true)}
                >
                  Reglas Básicas
                </div>
              </div>

              <div className="temporizador">
                <IonIcon icon={time} className="icono-tiempo" />
                <h5 className="tiempo-display">
                  {formatearTiempo(tiempoRestante)}
                </h5>
              </div>

              <div className="num-words">
                <strong>Puntuación: {puntuacionTotal}</strong>
              </div>
            </div>

            <div className="videogame">
              <PuzzleBoard
                difficulty={difficultyConfig}
                onSolved={handlePuzzleSolved}
                showSolvedOverlay={!showSummary}
                {...(imagenRompecabezas ? { imageSource: imagenRompecabezas } : {})}
              />
            </div>

            <div className="button game">
              <IonButton
                shape="round"
                expand="full"
                onClick={handlePausar}
                disabled={
                  showCountdown ||
                  showFeedback ||
                  showSummary ||
                  showInstructions ||
                  pausado ||
                  activeButtonIndex !== null ||
                  !isComplete
                }
              >
                <IonIcon slot="start" icon={pauseCircleOutline} />
                Pausar
              </IonButton>
            </div>
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default Home;
