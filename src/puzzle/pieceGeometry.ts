export type Difficulty = "basic" | "intermediate" | "advanced";

export type GridSize = {
  rows: number;
  cols: number;
};

export type PuzzlePiece = {
  id: string;
  row: number;
  col: number;
  location: "tray" | "board";
  x: number;
  y: number;
  tx: number;
  ty: number;
  traySlot: number | null;
  locked: boolean;
};

export type EdgeKind = "flat" | "tab" | "slot";

export type Point = {
  x: number;
  y: number;
};

export type CubicSegment = {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
};

export type EdgeProfile = {
  kind: EdgeKind;
  length: number;
  depth: number;
  segments: CubicSegment[];
};

export type PieceEdgeProfiles = {
  top: EdgeProfile;
  right: EdgeProfile;
  bottom: EdgeProfile;
  left: EdgeProfile;
};

export type PieceEdgeKinds = {
  top: EdgeKind;
  right: EdgeKind;
  bottom: EdgeKind;
  left: EdgeKind;
};

export type JigsawPieceGeometry = {
  id: string;
  row: number;
  col: number;
  edges: PieceEdgeKinds;
  path: string;
};

export type JigsawPresetName = "realistaSuave" | "muySuave";

export type JigsawPreset = {
  tabDepthRatio: number;
  tabWidthRatio: number;
  neckWidthRatio: number;
  bulbRoundness: number;
  shoulderSmoothness: number;
  jitter: number;
};

export type EdgeProfileOptions = {
  minDimension: number;
  tabDepth?: number;
  tabWidth?: number;
  neckWidth?: number;
  bulbRoundness?: number;
  shoulderSmoothness?: number;
  jitter?: number;
  rng?: () => number;
};

export type JigsawGeneratorOptions = {
  preset?: JigsawPresetName;
  seed?: string | number;
  tabDepth?: number;
  tabWidth?: number;
  neckWidth?: number;
  bulbRoundness?: number;
  shoulderSmoothness?: number;
  jitter?: number;
};

export const GRID_BY_DIFFICULTY: Record<Difficulty, GridSize> = {
  basic: { rows: 3, cols: 3 },
  intermediate: { rows: 4, cols: 4 },
  advanced: { rows: 5, cols: 5 },
};

export const JIGSAW_PRESETS: Record<JigsawPresetName, JigsawPreset> = {
  realistaSuave: {
    tabDepthRatio: 0.22,
    tabWidthRatio: 0.46,
    neckWidthRatio: 0.24,
    bulbRoundness: 0.66,
    shoulderSmoothness: 0.58,
    jitter: 0.05,
  },
  muySuave: {
    tabDepthRatio: 0.2,
    tabWidthRatio: 0.5,
    neckWidthRatio: 0.29,
    bulbRoundness: 0.82,
    shoulderSmoothness: 0.74,
    jitter: 0.04,
  },
};

export const getGridForDifficulty = (difficulty: Difficulty): GridSize => {
  return GRID_BY_DIFFICULTY[difficulty];
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

const round = (value: number): number => {
  return Number(value.toFixed(3));
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

const makeLinearProfile = (length: number): EdgeProfile => {
  const safeLength = Math.max(1, length);

  return {
    kind: "flat",
    length: safeLength,
    depth: 0,
    segments: [
      {
        start: { x: 0, y: 0 },
        cp1: { x: safeLength / 3, y: 0 },
        cp2: { x: (safeLength * 2) / 3, y: 0 },
        end: { x: safeLength, y: 0 },
      },
    ],
  };
};

const buildHermiteSegments = (
  points: Point[],
  tangents: Point[],
  yLimit: number,
): CubicSegment[] => {
  const segments: CubicSegment[] = [];

  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const tangentStart = tangents[index];
    const tangentEnd = tangents[index + 1];

    const span = end.x - start.x;
    const cp1xRaw = start.x + tangentStart.x / 3;
    const cp2xRaw = end.x - tangentEnd.x / 3;

    let cp1x = cp1xRaw;
    let cp2x = cp2xRaw;

    if (span > 1e-4) {
      const epsilon = Math.min(span * 0.2, Math.max(0.001, span * 0.06));
      cp1x = clamp(cp1xRaw, start.x + epsilon, end.x - epsilon);
      cp2x = clamp(cp2xRaw, start.x + epsilon, end.x - epsilon);
    }

    const cp1y = clamp(start.y + tangentStart.y / 3, -yLimit, yLimit);
    const cp2y = clamp(end.y - tangentEnd.y / 3, -yLimit, yLimit);

    segments.push({
      start,
      cp1: { x: cp1x, y: cp1y },
      cp2: { x: cp2x, y: cp2y },
      end,
    });
  }

  return segments;
};

export const makeEdgeProfile = (
  kind: EdgeKind,
  length: number,
  options: EdgeProfileOptions,
): EdgeProfile => {
  const safeLength = Math.max(1, length);

  if (kind === "flat") {
    return makeLinearProfile(safeLength);
  }

  const rng = options.rng ?? (() => 0.5);
  const jitterAmount = clamp(options.jitter ?? 0, 0, 0.12);
  const jitterFactor = (): number => 1 + (rng() * 2 - 1) * jitterAmount;

  const minDimension = Math.max(1, options.minDimension);

  const minDepth = minDimension * 0.18;
  const maxDepth = minDimension * 0.26;
  const baseDepth = options.tabDepth ?? minDimension * 0.22;
  const depthAbs = clamp(baseDepth * jitterFactor(), minDepth, maxDepth);

  const cornerSafeMargin = clamp(safeLength * 0.14, 6, safeLength * 0.22);
  const maxTabWidth = safeLength - cornerSafeMargin * 2;
  const minTabWidth = safeLength * 0.34;
  const baseTabWidth = options.tabWidth ?? safeLength * 0.46;
  const tabWidth = clamp(baseTabWidth * jitterFactor(), minTabWidth, maxTabWidth);

  const minNeckWidth = tabWidth * 0.38;
  const maxNeckWidth = tabWidth * 0.78;
  const baseNeckWidth = options.neckWidth ?? safeLength * 0.24;
  const neckWidth = clamp(
    baseNeckWidth * jitterFactor(),
    minNeckWidth,
    maxNeckWidth,
  );

  const bulbRoundness = clamp(
    (options.bulbRoundness ?? 0.66) * jitterFactor(),
    0.35,
    0.95,
  );
  const shoulderSmoothness = clamp(
    (options.shoulderSmoothness ?? 0.58) * jitterFactor(),
    0.35,
    0.95,
  );

  const direction = kind === "tab" ? 1 : -1;
  const depth = direction * depthAbs;

  const shoulderStart = (safeLength - tabWidth) / 2;
  const shoulderEnd = shoulderStart + tabWidth;
  const neckInset = (tabWidth - neckWidth) / 2;
  const neckStart = shoulderStart + neckInset;
  const neckEnd = neckStart + neckWidth;
  const center = safeLength / 2;

  const neckHeight = depth * (0.53 + bulbRoundness * 0.24);
  const peakHeight = depth;

  const points: Point[] = [
    { x: 0, y: 0 },
    { x: shoulderStart, y: 0 },
    { x: neckStart, y: neckHeight },
    { x: center, y: peakHeight },
    { x: neckEnd, y: neckHeight },
    { x: shoulderEnd, y: 0 },
    { x: safeLength, y: 0 },
  ];

  const shoulderSpan = Math.max(4, neckStart - shoulderStart);
  const shoulderTangent = shoulderSpan * (0.9 + shoulderSmoothness * 0.85);

  const neckDx = Math.max(
    neckWidth * 0.22,
    shoulderSpan * (0.45 + bulbRoundness * 0.35),
  );
  const neckDy = peakHeight * (0.7 + bulbRoundness * 0.25);

  const crownDx = Math.max(3, neckWidth * (0.35 + bulbRoundness * 0.2));
  const crownDy = peakHeight * (0.06 + (1 - bulbRoundness) * 0.08);

  const trailingSpan = Math.max(4, safeLength - shoulderEnd);
  const trailingTangent = trailingSpan * (0.9 + shoulderSmoothness * 0.85);

  const tangents: Point[] = [
    { x: Math.max(6, shoulderStart * 0.9), y: 0 },
    { x: shoulderTangent, y: 0 },
    { x: neckDx, y: neckDy },
    { x: crownDx, y: crownDy },
    { x: neckDx, y: -neckDy },
    { x: trailingTangent, y: 0 },
    { x: Math.max(6, trailingSpan * 0.9), y: 0 },
  ];

  const segments = buildHermiteSegments(points, tangents, depthAbs * 1.12).map(
    (segment) => ({
      start: { x: round(segment.start.x), y: round(segment.start.y) },
      cp1: { x: round(segment.cp1.x), y: round(segment.cp1.y) },
      cp2: { x: round(segment.cp2.x), y: round(segment.cp2.y) },
      end: { x: round(segment.end.x), y: round(segment.end.y) },
    }),
  );

  return {
    kind,
    length: round(safeLength),
    depth: round(depth),
    segments,
  };
};

export const invertEdgeProfile = (profile: EdgeProfile): EdgeProfile => {
  const invertedKind: EdgeKind =
    profile.kind === "flat"
      ? "flat"
      : profile.kind === "tab"
        ? "slot"
        : "tab";

  return {
    kind: invertedKind,
    length: profile.length,
    depth: round(-profile.depth),
    segments: profile.segments.map((segment) => ({
      start: { x: segment.start.x, y: round(-segment.start.y) },
      cp1: { x: segment.cp1.x, y: round(-segment.cp1.y) },
      cp2: { x: segment.cp2.x, y: round(-segment.cp2.y) },
      end: { x: segment.end.x, y: round(-segment.end.y) },
    })),
  };
};

const reverseEdgeProfile = (profile: EdgeProfile): EdgeProfile => {
  const mirrorX = (point: Point): Point => {
    return {
      x: round(profile.length - point.x),
      y: point.y,
    };
  };

  return {
    kind: profile.kind,
    length: profile.length,
    depth: profile.depth,
    segments: [...profile.segments].reverse().map((segment) => ({
      start: mirrorX(segment.end),
      cp1: mirrorX(segment.cp2),
      cp2: mirrorX(segment.cp1),
      end: mirrorX(segment.start),
    })),
  };
};

const invertAndReverseEdgeProfile = (profile: EdgeProfile): EdgeProfile => {
  return reverseEdgeProfile(invertEdgeProfile(profile));
};

const pointToString = (point: Point): string => {
  return `${round(point.x)} ${round(point.y)}`;
};

const appendProfileWithTransform = (
  commands: string[],
  profile: EdgeProfile,
  transform: (point: Point) => Point,
): void => {
  profile.segments.forEach((segment) => {
    const cp1 = transform(segment.cp1);
    const cp2 = transform(segment.cp2);
    const end = transform(segment.end);

    commands.push(
      `C ${pointToString(cp1)} ${pointToString(cp2)} ${pointToString(end)}`,
    );
  });
};

export const buildPiecePath = (
  pieceWidth: number,
  pieceHeight: number,
  edges: PieceEdgeProfiles,
): string => {
  const commands: string[] = ["M 0 0"];

  appendProfileWithTransform(commands, edges.top, (point) => ({
    x: point.x,
    y: -point.y,
  }));

  appendProfileWithTransform(commands, edges.right, (point) => ({
    x: pieceWidth + point.y,
    y: point.x,
  }));

  appendProfileWithTransform(commands, edges.bottom, (point) => ({
    x: pieceWidth - point.x,
    y: pieceHeight + point.y,
  }));

  appendProfileWithTransform(commands, edges.left, (point) => ({
    x: -point.y,
    y: pieceHeight - point.x,
  }));

  commands.push("Z");
  return commands.join(" ");
};

const buildEdgeKinds = (edges: PieceEdgeProfiles): PieceEdgeKinds => {
  return {
    top: edges.top.kind,
    right: edges.right.kind,
    bottom: edges.bottom.kind,
    left: edges.left.kind,
  };
};

const makeEdgeOptionsForLength = (
  length: number,
  minDimension: number,
  preset: JigsawPreset,
  options: JigsawGeneratorOptions,
  rng: () => number,
): EdgeProfileOptions => {
  return {
    minDimension,
    tabDepth: options.tabDepth ?? minDimension * preset.tabDepthRatio,
    tabWidth: options.tabWidth ?? length * preset.tabWidthRatio,
    neckWidth: options.neckWidth ?? length * preset.neckWidthRatio,
    bulbRoundness: options.bulbRoundness ?? preset.bulbRoundness,
    shoulderSmoothness: options.shoulderSmoothness ?? preset.shoulderSmoothness,
    jitter: options.jitter ?? preset.jitter,
    rng,
  };
};

export const createJigsawGeometry = (
  rows: number,
  cols: number,
  pieceWidth: number,
  pieceHeight: number,
  options: JigsawGeneratorOptions = {},
): JigsawPieceGeometry[] => {
  const presetName: JigsawPresetName = options.preset ?? "realistaSuave";
  const preset = JIGSAW_PRESETS[presetName];
  const baseSeed = options.seed ?? "ionic-jigsaw";
  const minDimension = Math.min(pieceWidth, pieceHeight);

  const flatHorizontal = makeEdgeProfile("flat", pieceWidth, {
    minDimension,
  });
  const flatVertical = makeEdgeProfile("flat", pieceHeight, {
    minDimension,
  });

  const pieceEdges: PieceEdgeProfiles[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      top: flatHorizontal,
      right: flatVertical,
      bottom: flatHorizontal,
      left: flatVertical,
    })),
  );

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols - 1; col += 1) {
      const rng = createSeededRng(`${baseSeed}:vertical:${row}:${col}`);
      const rightKind: EdgeKind = rng() < 0.5 ? "tab" : "slot";
      const rightProfile = makeEdgeProfile(
        rightKind,
        pieceHeight,
        makeEdgeOptionsForLength(
          pieceHeight,
          minDimension,
          preset,
          options,
          rng,
        ),
      );

      pieceEdges[row][col].right = rightProfile;
      pieceEdges[row][col + 1].left = invertAndReverseEdgeProfile(rightProfile);
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const rng = createSeededRng(`${baseSeed}:horizontal:${row}:${col}`);
      const topLowerKind: EdgeKind = rng() < 0.5 ? "tab" : "slot";
      const topLowerProfile = makeEdgeProfile(
        topLowerKind,
        pieceWidth,
        makeEdgeOptionsForLength(pieceWidth, minDimension, preset, options, rng),
      );

      pieceEdges[row + 1][col].top = topLowerProfile;
      pieceEdges[row][col].bottom = invertAndReverseEdgeProfile(topLowerProfile);
    }
  }

  const geometry: JigsawPieceGeometry[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const edges = pieceEdges[row][col];

      geometry.push({
        id: `${row}-${col}`,
        row,
        col,
        edges: buildEdgeKinds(edges),
        path: buildPiecePath(pieceWidth, pieceHeight, edges),
      });
    }
  }

  return geometry;
};

export const sanitizeSvgId = (value: string): string => {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
};

export const getPieceClipId = (prefix: string, pieceId: string): string => {
  return `clip-${sanitizeSvgId(prefix)}-${sanitizeSvgId(pieceId)}`;
};
