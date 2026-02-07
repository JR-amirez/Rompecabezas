import {
  memo,
  useId,
  useMemo,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Difficulty,
  PuzzlePiece,
  createJigsawGeometry,
  getPieceClipId,
  sanitizeSvgId,
} from "../puzzle/pieceGeometry";
import type { JigsawPresetName } from "../puzzle/pieceGeometry";
import { usePuzzle } from "../puzzle/usePuzzle";
import "./PuzzleBoard.css";

export const DEFAULT_BOARD_WIDTH = 720;
export const DEFAULT_BOARD_HEIGHT = 720;
export const DEFAULT_SNAP_DISTANCE = 28;
export const DEFAULT_IMAGE_SOURCE = "/assets/images.jpg";
export const DEFAULT_JIGSAW_PRESET: JigsawPresetName = "realistaSuave";
export const DEFAULT_JIGSAW_SEED = "rompecabezas-seed";
export const DEFAULT_TRAY_SCALE = 0.23;

type BoardPieceProps = {
  piece: PuzzlePiece;
  piecePath: string;
  clipPathId: string;
  imageSource: string;
  boardWidth: number;
  boardHeight: number;
  isActive: boolean;
  activeShadowId: string;
  onPointerDown: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  onPointerMove: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>, pieceId: string) => void;
  onPointerCancel: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
};

const BoardPiece: React.FC<BoardPieceProps> = ({
  piece,
  piecePath,
  clipPathId,
  imageSource,
  boardWidth,
  boardHeight,
  isActive,
  activeShadowId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) => {
  return (
    <g transform={`translate(${piece.x} ${piece.y})`} data-piece-id={piece.id}>
      <image
        href={imageSource}
        x={-piece.tx}
        y={-piece.ty}
        width={boardWidth}
        height={boardHeight}
        preserveAspectRatio="none"
        clipPath={`url(#${clipPathId})`}
        style={{ pointerEvents: "none", userSelect: "none" }}
      />

      {isActive && (
        <path
          d={piecePath}
          fill="none"
          stroke="#2563eb"
          strokeWidth={3}
          vectorEffect="non-scaling-stroke"
          filter={`url(#${activeShadowId})`}
          pointerEvents="none"
        />
      )}

      <path
        d={piecePath}
        fill="rgba(0, 0, 0, 0.001)"
        pointerEvents={piece.locked ? "none" : "all"}
        onPointerDown={(event) => onPointerDown(event, piece.id)}
        onPointerMove={(event) => onPointerMove(event, piece.id)}
        onPointerUp={(event) => onPointerUp(event, piece.id)}
        onPointerCancel={(event) => onPointerCancel(event, piece.id)}
        style={{
          cursor: piece.locked ? "default" : isActive ? "grabbing" : "grab",
          touchAction: "none",
        }}
      />
    </g>
  );
};

const MemoBoardPiece = memo(BoardPiece, (prev, next) => {
  return (
    prev.piece === next.piece &&
    prev.piecePath === next.piecePath &&
    prev.clipPathId === next.clipPathId &&
    prev.imageSource === next.imageSource &&
    prev.boardWidth === next.boardWidth &&
    prev.boardHeight === next.boardHeight &&
    prev.isActive === next.isActive &&
    prev.activeShadowId === next.activeShadowId &&
    prev.onPointerDown === next.onPointerDown &&
    prev.onPointerMove === next.onPointerMove &&
    prev.onPointerUp === next.onPointerUp &&
    prev.onPointerCancel === next.onPointerCancel
  );
});

type TrayPieceProps = {
  piece: PuzzlePiece;
  piecePath: string;
  clipPathId: string;
  imageSource: string;
  boardWidth: number;
  boardHeight: number;
  pieceWidth: number;
  pieceHeight: number;
  miniWidth: number;
  miniHeight: number;
  slotWidth: number;
  slotHeight: number;
  isActive: boolean;
  isGhost: boolean;
  activeShadowId: string;
  onPointerDown: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  onPointerMove: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  onPointerUp: (event: ReactPointerEvent<SVGElement>, pieceId: string) => void;
  onPointerCancel: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
};

const TrayPiece: React.FC<TrayPieceProps> = ({
  piece,
  piecePath,
  clipPathId,
  imageSource,
  boardWidth,
  boardHeight,
  pieceWidth,
  pieceHeight,
  miniWidth,
  miniHeight,
  slotWidth,
  slotHeight,
  isActive,
  isGhost,
  activeShadowId,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
}) => {
  return (
    <div
      className="trayPieceSlot"
      style={{
        width: slotWidth,
        height: slotHeight,
        opacity: isGhost ? 0.02 : 1,
      }}
    >
      <svg
        viewBox={`0 0 ${pieceWidth} ${pieceHeight}`}
        width={miniWidth}
        height={miniHeight}
        className="trayPieceSvg"
      >
        <defs>
          <clipPath id={clipPathId} clipPathUnits="userSpaceOnUse">
            <path d={piecePath} />
          </clipPath>
        </defs>

        <image
          href={imageSource}
          x={-piece.tx}
          y={-piece.ty}
          width={boardWidth}
          height={boardHeight}
          preserveAspectRatio="none"
          clipPath={`url(#${clipPathId})`}
          style={{ pointerEvents: "none", userSelect: "none" }}
        />

        {isActive && (
          <path
            d={piecePath}
            fill="none"
            stroke="#2563eb"
            strokeWidth={3}
            vectorEffect="non-scaling-stroke"
            filter={`url(#${activeShadowId})`}
            pointerEvents="none"
          />
        )}

        <path
          d={piecePath}
          fill="rgba(0, 0, 0, 0.001)"
          pointerEvents={piece.locked ? "none" : "all"}
          onPointerDown={(event) => onPointerDown(event, piece.id)}
          onPointerMove={(event) => onPointerMove(event, piece.id)}
          onPointerUp={(event) => onPointerUp(event, piece.id)}
          onPointerCancel={(event) => onPointerCancel(event, piece.id)}
          style={{
            cursor: piece.locked ? "default" : isActive ? "grabbing" : "grab",
            touchAction: "none",
          }}
        />
      </svg>
    </div>
  );
};

const MemoTrayPiece = memo(TrayPiece, (prev, next) => {
  return (
    prev.piece === next.piece &&
    prev.piecePath === next.piecePath &&
    prev.clipPathId === next.clipPathId &&
    prev.imageSource === next.imageSource &&
    prev.boardWidth === next.boardWidth &&
    prev.boardHeight === next.boardHeight &&
    prev.pieceWidth === next.pieceWidth &&
    prev.pieceHeight === next.pieceHeight &&
    prev.miniWidth === next.miniWidth &&
    prev.miniHeight === next.miniHeight &&
    prev.slotWidth === next.slotWidth &&
    prev.slotHeight === next.slotHeight &&
    prev.isActive === next.isActive &&
    prev.isGhost === next.isGhost &&
    prev.activeShadowId === next.activeShadowId &&
    prev.onPointerDown === next.onPointerDown &&
    prev.onPointerMove === next.onPointerMove &&
    prev.onPointerUp === next.onPointerUp &&
    prev.onPointerCancel === next.onPointerCancel
  );
});

export type PuzzleBoardProps = {
  difficulty?: Difficulty;
  boardWidth?: number;
  boardHeight?: number;
  snapDistance?: number;
  imageSource?: string;
  jigsawPreset?: JigsawPresetName;
  seed?: string | number;
  tabDepth?: number;
  tabWidth?: number;
  neckWidth?: number;
  bulbRoundness?: number;
  shoulderSmoothness?: number;
  jitter?: number;
  trayScale?: number;
  className?: string;
  onSolved?: () => void;
  showSolvedOverlay?: boolean;
};

type ConfettiPiece = {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
};

const PuzzleBoard: React.FC<PuzzleBoardProps> = ({
  difficulty = "basic",
  boardWidth = DEFAULT_BOARD_WIDTH,
  boardHeight = DEFAULT_BOARD_HEIGHT,
  snapDistance = DEFAULT_SNAP_DISTANCE,
  imageSource = DEFAULT_IMAGE_SOURCE,
  jigsawPreset = DEFAULT_JIGSAW_PRESET,
  seed = DEFAULT_JIGSAW_SEED,
  tabDepth,
  tabWidth,
  neckWidth,
  bulbRoundness,
  shoulderSmoothness,
  jitter,
  trayScale = DEFAULT_TRAY_SCALE,
  className,
  onSolved,
  showSolvedOverlay = true,
}) => {
  const safeTrayScale = Math.min(Math.max(trayScale, 0.15), 0.7);

  const {
    rows,
    cols,
    pieceWidth,
    pieceHeight,
    pieces,
    trayOrder,
    activePieceId,
    activeDragSource,
    isSolved,
    boardSvgRef,
    handleBoardPiecePointerDown,
    handleBoardPiecePointerMove,
    handleBoardPiecePointerUp,
    handleBoardPiecePointerCancel,
    handleTrayPiecePointerDown,
    handleTrayPiecePointerMove,
    handleTrayPiecePointerUp,
    handleTrayPiecePointerCancel,
  } = usePuzzle({
    difficulty,
    boardWidth,
    boardHeight,
    snapDistance,
    seed: `${seed}-${difficulty}`,
    onSolved,
  });

  const rawId = useId();
  const svgIdPrefix = useMemo(() => sanitizeSvgId(rawId), [rawId]);
  const activeShadowId = `piece-active-shadow-${svgIdPrefix}`;

  const jigsawGeometry = useMemo(() => {
    return createJigsawGeometry(rows, cols, pieceWidth, pieceHeight, {
      preset: jigsawPreset,
      seed: `${seed}-${difficulty}`,
      tabDepth,
      tabWidth,
      neckWidth,
      bulbRoundness,
      shoulderSmoothness,
      jitter,
    });
  }, [
    rows,
    cols,
    pieceWidth,
    pieceHeight,
    jigsawPreset,
    seed,
    difficulty,
    tabDepth,
    tabWidth,
    neckWidth,
    bulbRoundness,
    shoulderSmoothness,
    jitter,
  ]);

  const jigsawById = useMemo(() => {
    return new Map(jigsawGeometry.map((piece) => [piece.id, piece]));
  }, [jigsawGeometry]);

  const pieceById = useMemo(() => {
    return new Map(pieces.map((piece) => [piece.id, piece]));
  }, [pieces]);

  const boardPieces = useMemo(() => {
    return pieces.filter((piece) => piece.location === "board");
  }, [pieces]);

  const trayPieces = useMemo(() => {
    return trayOrder
      .map((id) => pieceById.get(id))
      .filter((piece): piece is PuzzlePiece => {
        if (!piece) {
          return false;
        }

        if (piece.location === "tray") {
          return true;
        }

        return activeDragSource === "tray" && activePieceId === piece.id;
      });
  }, [trayOrder, pieceById, activeDragSource, activePieceId]);

  const verticalGuides = useMemo(() => {
    return Array.from({ length: cols + 1 }, (_, index) => index * pieceWidth);
  }, [cols, pieceWidth]);

  const horizontalGuides = useMemo(() => {
    return Array.from({ length: rows + 1 }, (_, index) => index * pieceHeight);
  }, [rows, pieceHeight]);

  const miniWidth = pieceWidth * safeTrayScale;
  const miniHeight = pieceHeight * safeTrayScale;
  const slotWidth = miniWidth + 18;
  const slotHeight = miniHeight + 18;

  const PUNTOS_POR_DIFICULTAD: Record<Difficulty, number> = {
    basic: 10,
    intermediate: 15,
    advanced: 20,
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

  return (
    <>
      {showSolvedOverlay && isSolved && (
        <div className="congrats-overlay">
          <div className="congrats-content">
            <div className="congrats-emoji">🥳</div>
            <div className="congrats-text">¡Felicidades!</div>
            <div className="congrats-points">
              +{PUNTOS_POR_DIFICULTAD[difficulty]} puntos
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

      <section className={`puzzle-stage1 ${className ?? ""}`.trim()}>
        <div className="puzzle-stage1__canvas" style={{ touchAction: "none" }}>
          <svg
            ref={boardSvgRef}
            viewBox={`0 0 ${boardWidth} ${boardHeight}`}
            className="puzzle-stage1__svg"
            role="img"
            aria-label="Tablero del rompecabezas"
          >
            <defs>
              <filter
                id={activeShadowId}
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
              >
                <feDropShadow
                  dx="0"
                  dy="2"
                  stdDeviation="4"
                  floodColor="#1d4ed8"
                  floodOpacity="0.45"
                />
              </filter>

              {jigsawGeometry.map((piece) => (
                <clipPath
                  key={piece.id}
                  id={getPieceClipId(`${svgIdPrefix}-board`, piece.id)}
                  clipPathUnits="userSpaceOnUse"
                >
                  <path d={piece.path} />
                </clipPath>
              ))}
            </defs>

            <rect
              x={0}
              y={0}
              width={boardWidth}
              height={boardHeight}
              rx={16}
              fill="#f8fafc"
              stroke="#bfdbfe"
              strokeWidth={2}
            />

            {verticalGuides.map((x) => (
              <line
                key={`v-${x}`}
                x1={x}
                y1={0}
                x2={x}
                y2={boardHeight}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            ))}

            {horizontalGuides.map((y) => (
              <line
                key={`h-${y}`}
                x1={0}
                y1={y}
                x2={boardWidth}
                y2={y}
                stroke="#cbd5e1"
                strokeWidth={1}
              />
            ))}

            {boardPieces.map((piece) => {
              const geometry = jigsawById.get(piece.id);
              if (!geometry) {
                return null;
              }

              const isActive = activePieceId === piece.id && !piece.locked;
              const clipPathId = getPieceClipId(
                `${svgIdPrefix}-board`,
                piece.id,
              );

              return (
                <MemoBoardPiece
                  key={piece.id}
                  piece={piece}
                  piecePath={geometry.path}
                  clipPathId={clipPathId}
                  imageSource={imageSource}
                  boardWidth={boardWidth}
                  boardHeight={boardHeight}
                  isActive={isActive}
                  activeShadowId={activeShadowId}
                  onPointerDown={handleBoardPiecePointerDown}
                  onPointerMove={handleBoardPiecePointerMove}
                  onPointerUp={handleBoardPiecePointerUp}
                  onPointerCancel={handleBoardPiecePointerCancel}
                />
              );
            })}
          </svg>
        </div>

        <div className="tray" aria-label="Bandeja de piezas" role="list">
          {trayPieces.map((piece) => {
            const geometry = jigsawById.get(piece.id);
            if (!geometry) {
              return null;
            }

            const isActive = activePieceId === piece.id && !piece.locked;
            const isGhost =
              activeDragSource === "tray" &&
              activePieceId === piece.id &&
              piece.location === "board";
            const clipPathId = getPieceClipId(`${svgIdPrefix}-tray`, piece.id);

            return (
              <MemoTrayPiece
                key={piece.id}
                piece={piece}
                piecePath={geometry.path}
                clipPathId={clipPathId}
                imageSource={imageSource}
                boardWidth={boardWidth}
                boardHeight={boardHeight}
                pieceWidth={pieceWidth}
                pieceHeight={pieceHeight}
                miniWidth={miniWidth}
                miniHeight={miniHeight}
                slotWidth={slotWidth}
                slotHeight={slotHeight}
                isActive={isActive}
                isGhost={isGhost}
                activeShadowId={activeShadowId}
                onPointerDown={handleTrayPiecePointerDown}
                onPointerMove={handleTrayPiecePointerMove}
                onPointerUp={handleTrayPiecePointerUp}
                onPointerCancel={handleTrayPiecePointerCancel}
              />
            );
          })}
        </div>
      </section>
    </>
  );
};

export default PuzzleBoard;
