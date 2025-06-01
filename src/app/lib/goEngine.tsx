// src/lib/goEngine.ts

export const BOARD_SIZE = 13;

export interface Coordinate {
  x: number;
  y: number;
}

export interface GroupDetails {
  stones: Coordinate[];
  liberties: Set<string>;
  player: number;
}

function isOnBoard(x: number, y: number): boolean {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function getGroupDetails(
  boardState: number[][],
  startX: number,
  startY: number
): GroupDetails | null {
  if (!isOnBoard(startX, startY) || boardState[startY][startX] === 0) {
    return null;
  }

  const player = boardState[startY][startX];
  const stonesInGroup: Coordinate[] = [];
  const liberties = new Set<string>();

  const queue: Coordinate[] = [{ x: startX, y: startY }];
  const visitedThisSearch = new Set<string>();
  visitedThisSearch.add(`${startY},${startX}`);

  while (queue.length > 0) {
    const currentStone = queue.shift();
    if (!currentStone) continue;

    stonesInGroup.push(currentStone);

    const neighbors: Coordinate[] = [
      { x: currentStone.x, y: currentStone.y - 1 },
      { x: currentStone.x, y: currentStone.y + 1 },
      { x: currentStone.x - 1, y: currentStone.y },
      { x: currentStone.x + 1, y: currentStone.y },
    ];

    for (const neighbor of neighbors) {
      const coordString = `${neighbor.y},${neighbor.x}`;

      if (!isOnBoard(neighbor.x, neighbor.y)) {
        continue;
      }

      const neighborPlayer = boardState[neighbor.y][neighbor.x];

      if (neighborPlayer === 0) {
        liberties.add(coordString);
      } else if (
        neighborPlayer === player &&
        !visitedThisSearch.has(coordString)
      ) {
        visitedThisSearch.add(coordString);
        queue.push(neighbor);
      }
    }
  }
  return {
    stones: stonesInGroup,
    liberties: liberties,
    player: player,
  };
}

/**
 * Hjelpefunksjon for å sammenligne to brettstillinger.
 */
function boardsAreEqual(board1: number[][], board2: number[][]): boolean {
  if (!board1 || !board2) return false;
  if (board1.length !== board2.length) return false;
  for (let i = 0; i < board1.length; i++) {
    if (board1[i].length !== board2[i].length) return false;
    for (let j = 0; j < board1[i].length; j++) {
      if (board1[i][j] !== board2[i][j]) return false;
    }
  }
  return true;
}

export function processMove(
  currentBoardState: number[][],
  x: number,
  y: number,
  player: number,
  activeKoPoint: Coordinate | null,
  // NY PARAMETER: Brettet slik det var FØR motstanderens siste trekk (som kan ha skapt activeKoPoint)
  boardStateBeforeOpponentMove: number[][] | null
): {
  newBoard: number[][];
  capturedStonesCount: number;
  isValid: boolean;
  message?: string;
  nextKoPoint: Coordinate | null;
} {
  if (!isOnBoard(x, y)) {
    return {
      newBoard: currentBoardState,
      capturedStonesCount: 0,
      isValid: false,
      message: "Utenfor brettet.",
      nextKoPoint: activeKoPoint,
    };
  }
  if (currentBoardState[y][x] !== 0) {
    return {
      newBoard: currentBoardState,
      capturedStonesCount: 0,
      isValid: false,
      message: "Feltet er allerede okkupert.",
      nextKoPoint: activeKoPoint,
    };
  }

  if (activeKoPoint && activeKoPoint.x === x && activeKoPoint.y === y) {
    return {
      newBoard: currentBoardState,
      capturedStonesCount: 0,
      isValid: false,
      message: "Ugyldig trekk: Ko (kan ikke umiddelbart ta tilbake).",
      nextKoPoint: activeKoPoint,
    };
  }

  const tempBoard = currentBoardState.map((row) => [...row]);
  tempBoard[y][x] = player;

  let capturedStonesCount = 0;
  const opponent = player === 1 ? 2 : 1;
  let potentialNextKoPoint: Coordinate | null = null;
  let capturedStoneCoordForSuperKo: Coordinate | null = null;

  const neighborsToPlacedStone: Coordinate[] = [
    { x: x, y: y - 1 },
    { x: x, y: y + 1 },
    { x: x - 1, y: y },
    { x: x + 1, y: y },
  ];
  const checkedOpponentGroups = new Set<string>();

  for (const neighbor of neighborsToPlacedStone) {
    if (
      isOnBoard(neighbor.x, neighbor.y) &&
      tempBoard[neighbor.y][neighbor.x] === opponent
    ) {
      const group = getGroupDetails(tempBoard, neighbor.x, neighbor.y);
      if (group && group.stones.length > 0) {
        const groupIdentifier = group.stones
          .map((s) => `${s.y},${s.x}`)
          .sort()
          .join(";");
        if (checkedOpponentGroups.has(groupIdentifier)) {
          continue;
        }
        checkedOpponentGroups.add(groupIdentifier);

        if (group.liberties.size === 0) {
          if (group.stones.length === 1) {
            capturedStoneCoordForSuperKo = {
              x: group.stones[0].x,
              y: group.stones[0].y,
            };
          }
          group.stones.forEach((stone) => {
            tempBoard[stone.y][stone.x] = 0;
            capturedStonesCount++;
          });
        }
      }
    }
  }

  if (
    capturedStonesCount === 1 &&
    capturedStoneCoordForSuperKo &&
    boardStateBeforeOpponentMove
  ) {
    if (boardsAreEqual(tempBoard, boardStateBeforeOpponentMove)) {
      return {
        newBoard: currentBoardState,
        capturedStonesCount: 0,
        isValid: false,
        message: "Ugyldig trekk: Ko (gjentar tidligere brettstilling).",
        nextKoPoint: activeKoPoint,
      };
    }
  }

  if (capturedStonesCount === 1 && capturedStoneCoordForSuperKo) {
    potentialNextKoPoint = capturedStoneCoordForSuperKo;
  } else {
    potentialNextKoPoint = null;
  }

  const ownGroupDetails = getGroupDetails(tempBoard, x, y);
  if (ownGroupDetails && ownGroupDetails.liberties.size === 0) {
    if (capturedStonesCount === 0) {
      return {
        newBoard: currentBoardState,
        capturedStonesCount: 0,
        isValid: false,
        message: "Ugyldig trekk: Selvmord.",
        nextKoPoint: null,
      };
    }
  }

  return {
    newBoard: tempBoard,
    capturedStonesCount: capturedStonesCount,
    isValid: true,
    nextKoPoint: potentialNextKoPoint,
  };
}

// Testkode kan beholdes utkommentert for isolert testing senere
/*
const createEmptyTestBoard = (size: number = 5): number[][] => Array(size).fill(null).map(() => Array(size).fill(0));
// ... (resten av testkoden, husk å oppdatere processMove-kall til å ha 6 argumenter)
// f.eks. processMove(board3_initial, 2, 1, 2, null, null)
*/
