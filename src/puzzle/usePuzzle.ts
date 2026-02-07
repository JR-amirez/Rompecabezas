import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from "react";
import { Difficulty, PuzzlePiece, getGridForDifficulty } from "./pieceGeometry";

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const distance = (ax: number, ay: number, bx: number, by: number): number => {
  return Math.hypot(ax - bx, ay - by);
};

const pointInBoard = (
  x: number,
  y: number,
  boardWidth: number,
  boardHeight: number,
): boolean => {
  return x >= 0 && x <= boardWidth && y >= 0 && y <= boardHeight;
};

const shuffleArray = <T,>(items: T[], random: () => number): T[] => {
  const next = [...items];

  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }

  return next;
};

const bringPieceToFront = (
  pieces: PuzzlePiece[],
  pieceId: string,
): PuzzlePiece[] => {
  const index = pieces.findIndex((piece) => piece.id === pieceId);
  if (index === -1 || index === pieces.length - 1) {
    return pieces;
  }

  const ordered = [...pieces];
  const [piece] = ordered.splice(index, 1);
  ordered.push(piece);
  return ordered;
};

const replacePieceAtIndex = (
  pieces: PuzzlePiece[],
  index: number,
  nextPiece: PuzzlePiece,
): PuzzlePiece[] => {
  if (pieces[index] === nextPiece) {
    return pieces;
  }

  const next = [...pieces];
  next[index] = nextPiece;
  return next;
};

const hashSeed = (seed: string | number): number => {
  const text = String(seed);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createSeededRng = (seed: string | number): (() => number) => {
  let state = hashSeed(seed) || 1;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const createTrayOrder = (
  rows: number,
  cols: number,
  seed?: string | number,
): string[] => {
  const ids: string[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      ids.push(`${row}-${col}`);
    }
  }

  const random =
    typeof seed === "undefined"
      ? () => Math.random()
      : createSeededRng(`${seed}:tray:${rows}x${cols}`);

  return shuffleArray(ids, random);
};

const createInitialPieces = (
  rows: number,
  cols: number,
  pieceWidth: number,
  pieceHeight: number,
  trayOrder: string[],
): PuzzlePiece[] => {
  const trayOrderIndex = new Map<string, number>();
  trayOrder.forEach((id, index) => {
    trayOrderIndex.set(id, index);
  });

  const pieces: PuzzlePiece[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const id = `${row}-${col}`;

      pieces.push({
        id,
        row,
        col,
        location: "tray",
        x: col * pieceWidth,
        y: row * pieceHeight,
        tx: col * pieceWidth,
        ty: row * pieceHeight,
        traySlot: trayOrderIndex.get(id) ?? null,
        locked: false,
      });
    }
  }

  return pieces;
};

type DragSource = "tray" | "board";

type DragState = {
  pieceId: string;
  pointerId: number;
  source: DragSource;
  offsetX: number;
  offsetY: number;
};

const clientToBoard = (
  clientX: number,
  clientY: number,
  svgElement: SVGSVGElement,
  boardWidth: number,
  boardHeight: number,
): { x: number; y: number } => {
  const rect = svgElement.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: ((clientX - rect.left) / rect.width) * boardWidth,
    y: ((clientY - rect.top) / rect.height) * boardHeight,
  };
};

const getSourceSvgElement = (element: SVGElement): SVGSVGElement | null => {
  if (element instanceof SVGSVGElement) {
    return element;
  }

  return element.ownerSVGElement;
};

export type UsePuzzleOptions = {
  difficulty: Difficulty;
  boardWidth: number;
  boardHeight: number;
  snapDistance: number;
  seed?: string | number;
  onSolved?: () => void;
};

export type UsePuzzleResult = {
  rows: number;
  cols: number;
  pieceWidth: number;
  pieceHeight: number;
  pieces: PuzzlePiece[];
  trayOrder: string[];
  activePieceId: string | null;
  activeDragSource: "tray" | "board" | null;
  lockedCount: number;
  boardPieceCount: number;
  trayPieceCount: number;
  totalPieces: number;
  isSolved: boolean;
  boardSvgRef: RefObject<SVGSVGElement | null>;
  resetPuzzle: () => void;
  handleBoardPiecePointerDown: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleBoardPiecePointerMove: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleBoardPiecePointerUp: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleBoardPiecePointerCancel: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleTrayPiecePointerDown: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleTrayPiecePointerMove: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleTrayPiecePointerUp: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
  handleTrayPiecePointerCancel: (
    event: ReactPointerEvent<SVGElement>,
    pieceId: string,
  ) => void;
};

export const usePuzzle = ({
  difficulty,
  boardWidth,
  boardHeight,
  snapDistance,
  seed,
  onSolved,
}: UsePuzzleOptions): UsePuzzleResult => {
  const { rows, cols } = getGridForDifficulty(difficulty);

  const pieceWidth = boardWidth / cols;
  const pieceHeight = boardHeight / rows;
  const totalPieces = rows * cols;

  const trayOrder = useMemo(() => {
    return createTrayOrder(rows, cols, seed);
  }, [rows, cols, seed]);

  const [pieces, setPieces] = useState<PuzzlePiece[]>([]);
  const [activePieceId, setActivePieceId] = useState<string | null>(null);
  const [activeDragSource, setActiveDragSource] = useState<
    "tray" | "board" | null
  >(null);

  const boardSvgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const solvedNotifiedRef = useRef(false);
  const piecesRef = useRef<PuzzlePiece[]>([]);
  const dragPositionRef = useRef<{ x: number; y: number } | null>(null);
  const dragElementRef = useRef<Element | null>(null);
  const rafIdRef = useRef<number>(0);

  useEffect(() => {
    piecesRef.current = pieces;
  }, [pieces]);

  useEffect(() => {
    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, []);

  const lockedCount = useMemo(() => {
    return pieces.filter((piece) => piece.locked).length;
  }, [pieces]);

  const boardPieceCount = useMemo(() => {
    return pieces.filter((piece) => piece.location === "board").length;
  }, [pieces]);

  const trayPieceCount = useMemo(() => {
    return pieces.filter((piece) => piece.location === "tray").length;
  }, [pieces]);

  const isSolved = totalPieces > 0 && lockedCount === totalPieces;

  const resetPuzzle = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    dragPositionRef.current = null;
    dragElementRef.current = null;

    setPieces(createInitialPieces(rows, cols, pieceWidth, pieceHeight, trayOrder));

    setActivePieceId(null);
    setActiveDragSource(null);
    dragStateRef.current = null;
    solvedNotifiedRef.current = false;
  }, [rows, cols, pieceWidth, pieceHeight, trayOrder]);

  useEffect(() => {
    resetPuzzle();
  }, [resetPuzzle]);

  useEffect(() => {
    if (!isSolved || solvedNotifiedRef.current || !onSolved) {
      return;
    }

    solvedNotifiedRef.current = true;
    onSolved();
  }, [isSolved, onSolved]);

  const finishDrag = useCallback(
    (
      pieceId: string,
      dragSource: DragSource,
      clientX: number,
      clientY: number,
    ) => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = 0;
      }
      dragPositionRef.current = null;
      dragElementRef.current = null;

      const boardSvg = boardSvgRef.current;

      if (!boardSvg) {
        setActivePieceId(null);
        setActiveDragSource(null);
        dragStateRef.current = null;
        return;
      }

      const pointer = clientToBoard(
        clientX,
        clientY,
        boardSvg,
        boardWidth,
        boardHeight,
      );
      const droppedInBoard = pointInBoard(
        pointer.x,
        pointer.y,
        boardWidth,
        boardHeight,
      );

      setPieces((currentPieces) => {
        const index = currentPieces.findIndex((piece) => piece.id === pieceId);
        if (index === -1) {
          return currentPieces;
        }

        const piece = currentPieces[index];

        if (piece.locked) {
          return currentPieces;
        }

        const dragState = dragStateRef.current;
        const offsetX = dragState?.offsetX ?? pieceWidth * 0.5;
        const offsetY = dragState?.offsetY ?? pieceHeight * 0.5;

        if (!droppedInBoard) {
          if (dragSource === "tray" && piece.location === "tray") {
            return currentPieces;
          }

          const nextPiece: PuzzlePiece = {
            ...piece,
            location: "tray",
            locked: false,
          };

          return replacePieceAtIndex(currentPieces, index, nextPiece);
        }

        const nextX = clamp(pointer.x - offsetX, 0, boardWidth - pieceWidth);
        const nextY = clamp(pointer.y - offsetY, 0, boardHeight - pieceHeight);
        const shouldSnap = distance(nextX, nextY, piece.tx, piece.ty) <= snapDistance;

        const nextPiece: PuzzlePiece = shouldSnap
          ? {
              ...piece,
              location: "board",
              x: piece.tx,
              y: piece.ty,
              locked: true,
            }
          : {
              ...piece,
              location: "board",
              x: nextX,
              y: nextY,
              locked: false,
            };

        return replacePieceAtIndex(currentPieces, index, nextPiece);
      });

      setActivePieceId(null);
      setActiveDragSource(null);
      dragStateRef.current = null;
    },
    [boardWidth, boardHeight, pieceWidth, pieceHeight, snapDistance],
  );

  const cancelDrag = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
    }
    dragPositionRef.current = null;
    dragElementRef.current = null;

    setActivePieceId(null);
    setActiveDragSource(null);
    dragStateRef.current = null;
  }, []);

  const handleBoardPiecePointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const boardSvg = boardSvgRef.current;
      if (!boardSvg) {
        return;
      }

      const piece = piecesRef.current.find((candidate) => candidate.id === pieceId);
      if (!piece || piece.locked || piece.location !== "board") {
        return;
      }

      const pointer = clientToBoard(
        event.clientX,
        event.clientY,
        boardSvg,
        boardWidth,
        boardHeight,
      );

      dragStateRef.current = {
        pieceId,
        pointerId: event.pointerId,
        source: "board",
        offsetX: pointer.x - piece.x,
        offsetY: pointer.y - piece.y,
      };

      setActivePieceId(pieceId);
      setActiveDragSource("board");
      setPieces((currentPieces) => bringPieceToFront(currentPieces, pieceId));

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [boardWidth, boardHeight],
  );

  const handleTrayPiecePointerDown = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      const piece = piecesRef.current.find((candidate) => candidate.id === pieceId);
      if (!piece || piece.locked || piece.location !== "tray") {
        return;
      }

      const sourceSvg = getSourceSvgElement(event.currentTarget);
      if (!sourceSvg) {
        return;
      }

      const sourceRect = sourceSvg.getBoundingClientRect();
      if (sourceRect.width === 0 || sourceRect.height === 0) {
        return;
      }

      const localX = clamp(
        ((event.clientX - sourceRect.left) / sourceRect.width) * pieceWidth,
        0,
        pieceWidth,
      );
      const localY = clamp(
        ((event.clientY - sourceRect.top) / sourceRect.height) * pieceHeight,
        0,
        pieceHeight,
      );

      dragStateRef.current = {
        pieceId,
        pointerId: event.pointerId,
        source: "tray",
        offsetX: localX,
        offsetY: localY,
      };

      setActivePieceId(pieceId);
      setActiveDragSource("tray");
      setPieces((currentPieces) => bringPieceToFront(currentPieces, pieceId));

      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [pieceWidth, pieceHeight],
  );

  const handleBoardPiecePointerMove = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "board" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      const boardSvg = boardSvgRef.current;
      if (!boardSvg) {
        return;
      }

      const pointer = clientToBoard(
        event.clientX,
        event.clientY,
        boardSvg,
        boardWidth,
        boardHeight,
      );

      const nextX = clamp(pointer.x - dragState.offsetX, 0, boardWidth - pieceWidth);
      const nextY = clamp(pointer.y - dragState.offsetY, 0, boardHeight - pieceHeight);

      setPieces((currentPieces) => {
        const index = currentPieces.findIndex((piece) => piece.id === pieceId);
        if (index === -1) {
          return currentPieces;
        }

        const piece = currentPieces[index];
        if (piece.locked || piece.location !== "board") {
          return currentPieces;
        }

        if (piece.x === nextX && piece.y === nextY) {
          return currentPieces;
        }

        return replacePieceAtIndex(currentPieces, index, {
          ...piece,
          x: nextX,
          y: nextY,
        });
      });

      event.preventDefault();
    },
    [boardWidth, boardHeight, pieceWidth, pieceHeight],
  );

  const handleTrayPiecePointerMove = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "tray" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      const boardSvg = boardSvgRef.current;
      if (!boardSvg) {
        return;
      }

      const pointer = clientToBoard(
        event.clientX,
        event.clientY,
        boardSvg,
        boardWidth,
        boardHeight,
      );

      const nextX = clamp(pointer.x - dragState.offsetX, 0, boardWidth - pieceWidth);
      const nextY = clamp(pointer.y - dragState.offsetY, 0, boardHeight - pieceHeight);

      // Store latest position — the rAF callback always reads the freshest value
      dragPositionRef.current = { x: nextX, y: nextY };

      // Throttle updates to one per animation frame
      if (!rafIdRef.current) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = 0;
          const pos = dragPositionRef.current;
          if (!pos) return;

          // Fast path: move the <g> element directly (no React re-render)
          if (!dragElementRef.current) {
            dragElementRef.current = boardSvg.querySelector(
              `[data-piece-id="${pieceId}"]`,
            );
          }

          if (dragElementRef.current) {
            dragElementRef.current.setAttribute(
              "transform",
              `translate(${pos.x} ${pos.y})`,
            );
          } else {
            // Piece not yet on the board — transition via React state
            setPieces((currentPieces) => {
              const index = currentPieces.findIndex((p) => p.id === pieceId);
              if (index === -1) return currentPieces;
              const piece = currentPieces[index];
              if (piece.locked) return currentPieces;
              return replacePieceAtIndex(currentPieces, index, {
                ...piece,
                location: "board",
                x: pos.x,
                y: pos.y,
                locked: false,
              });
            });
          }
        });
      }

      event.preventDefault();
    },
    [boardWidth, boardHeight, pieceWidth, pieceHeight],
  );

  const handleBoardPiecePointerUp = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "board" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      finishDrag(pieceId, "board", event.clientX, event.clientY);
      event.preventDefault();
    },
    [finishDrag],
  );

  const handleTrayPiecePointerUp = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "tray" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      finishDrag(pieceId, "tray", event.clientX, event.clientY);
      event.preventDefault();
    },
    [finishDrag],
  );

  const handleBoardPiecePointerCancel = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "board" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      cancelDrag();
      event.preventDefault();
    },
    [cancelDrag],
  );

  const handleTrayPiecePointerCancel = useCallback(
    (event: ReactPointerEvent<SVGElement>, pieceId: string) => {
      const dragState = dragStateRef.current;
      if (
        !dragState ||
        dragState.source !== "tray" ||
        dragState.pieceId !== pieceId ||
        dragState.pointerId !== event.pointerId
      ) {
        return;
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }

      cancelDrag();
      event.preventDefault();
    },
    [cancelDrag],
  );

  return {
    rows,
    cols,
    pieceWidth,
    pieceHeight,
    pieces,
    trayOrder,
    activePieceId,
    activeDragSource,
    lockedCount,
    boardPieceCount,
    trayPieceCount,
    totalPieces,
    isSolved,
    boardSvgRef,
    resetPuzzle,
    handleBoardPiecePointerDown,
    handleBoardPiecePointerMove,
    handleBoardPiecePointerUp,
    handleBoardPiecePointerCancel,
    handleTrayPiecePointerDown,
    handleTrayPiecePointerMove,
    handleTrayPiecePointerUp,
    handleTrayPiecePointerCancel,
  };
};
