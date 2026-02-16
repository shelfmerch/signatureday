export type SlotKind =
  | 'topExtMost'
  | 'topExt'
  | 'top'
  | 'left'
  | 'center'
  | 'right'
  | 'bottom'
  | 'bottomExt'
  | 'bottomMostExt';

export type SlotSpec = {
  kind: SlotKind;
  index: number; // -1 means center member
  r: number; // grid row index used by renderer (virtual rows per template)
  c: number; // grid col index (can be fractional for centered small rows)
  rspan?: number;
  cspan?: number;
};

export type EnumerateCallback = (slot: SlotSpec) => Promise<void> | void;

// 45 template: 8 columns x 11 rows (virtual), center spans 6x5
// Indices mapping:
// 0..7   -> top row
// 8..12  -> left border (rows 1..5)
// 13..17 -> right border (rows 1..5)
// 18..25 -> bottom row
// 26..33 -> bottom extension (8)
// 34..36 -> bottom-most extension (3)
// 37..44 -> topExt-most (8)
export async function enumerate45(cb: EnumerateCallback) {
  // 1) Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 37 + i, r: 0, c: i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x5) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // 8) Bottom-most extension (3 cells, centered) – row 10, cols 2.5..4.5
  for (let i = 0; i < 3; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 2.5 + i });
  }
}

export async function enumerate12(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 3; r++) {
    await cb({ kind: 'left', index: 3 + r, r: 1.5 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 3; r++) {
    await cb({ kind: 'right', index: 6 + r, r: 1.5 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'bottom', index: 9 + c, r: 5, c: 1.5 + c });
  }
}

export async function enumerate13(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 3; r++) {
    await cb({ kind: 'left', index: 3 + r, r: 1.5 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 3; r++) {
    await cb({ kind: 'right', index: 6 + r, r: 1.5 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottom', index: 9 + c, r: 5, c: 1 + c });
  }
}

export async function enumerate14(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'left', index: 3 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'right', index: 7 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'bottom', index: 11 + c, r: 5, c: 1.5 + c });
  }
}

export async function enumerate15(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'left', index: 3 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'right', index: 7 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottom', index: 11 + c, r: 5, c: 1 + c });
  }
}

export async function enumerate16(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'left', index: 4 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'right', index: 8 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottom', index: 12 + c, r: 5, c: 1 + c });
  }
}

export async function enumerate17(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'left', index: 4 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 4, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 4; r++) {
    await cb({ kind: 'right', index: 8 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottom', index: 12 + c, r: 5, c: 0.5 + c });
  }
}

export async function enumerate18(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 4 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 9 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottom', index: 13 + c, r: 6, c: 1 + c });
  }
}

// 19 template: 6 columns x 7 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..32 -> bottom extension (5 centered)
export async function enumerate19(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 4 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 4 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 9 + r, r: 1 + r, c: 5 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottom', index: 13 + c, r: 6, c: 0.5 + c });
  }
}

// 19 template: 6 columns x 7 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..32 -> bottom extension (5 centered)
export async function enumerate20(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 1 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 5 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 5 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 10 + r, r: 1 + r, c: 6 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottom', index: 15 + c, r: 6, c: 1 + c });
  }
}


export async function enumerate21(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 0.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 6 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 5 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 11 + r, r: 1 + r, c: 6 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottom', index: 16 + c, r: 6, c: 1 + c });
  }
}

export async function enumerate22(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: 0.5 + c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 6 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 5 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 11 + r, r: 1 + r, c: 6 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottom', index: 16 + c, r: 6, c: 0.5 + c });
  }
}

export async function enumerate23(cb: EnumerateCallback) {
  // 1) Top row (4 cells) – row 0
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'top', index: c, r: 0, c: c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 7 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 5, cspan: 5 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 12 + r, r: 1 + r, c: 6 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottom', index: 17 + c, r: 6, c: 0.5 + c });
  }
}


// 33 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..32 -> bottom extension (5 centered)
export async function enumerate33(cb: EnumerateCallback) {
  // 1) Top row (8 cells) – row 0
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 0, c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 6, cspan: 6 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 1 + r, c: 7 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 7, c });
  }
  // 6) Bottom extension (5 cells, centered) – row 8, cols 1.5..5.5
  for (let i = 0; i < 5; i++) {
    await cb({ kind: 'bottomExt', index: 28 + i, r: 8, c: 1.5 + i });
  }
}


// 34 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..33 -> bottom extension (6 centered)
export async function enumerate34(cb: EnumerateCallback) {
  // 1) Top row (8 cells) – row 0
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 0, c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 6, cspan: 6 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 1 + r, c: 7 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 7, c });
  }
  // 6) Bottom extension (6 cells, centered) – row 8, cols 1...6
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'bottomExt', index: 28 + i, r: 8, c: 1 + i });
  }
}

// 35 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..34 -> bottom extension (7 centered)
export async function enumerate35(cb: EnumerateCallback) {
  // 1) Top row (8 cells) – row 0
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 0, c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 6, cspan: 6 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 1 + r, c: 7 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 7, c });
  }
  // 6) Bottom extension (6 cells, centered) – row 8, cols 1...6
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'bottomExt', index: 28 + i, r: 8, c: 0.5 + i });
  }
}


// 36 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate36(cb: EnumerateCallback) {
  // 1) Top row (8 cells) – row 0
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 0, c });
  }
  // 2) Left side (6 cells) – rows 1..6 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 1 + r, c: 0 });
  }
  // 3) Center (spans 6x6) – starts at row 1, col 1
  await cb({ kind: 'center', index: -1, r: 1, c: 1, rspan: 6, cspan: 6 });
  // 4) Right side (6 cells) – rows 1..6 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 1 + r, c: 7 });
  }
  // 5) Bottom row (8 cells) – row 7
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 7, c });
  }
  // 6) Bottom extension (6 cells, centered) – row 8, cols 1...6
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'bottomExt', index: 28 + i, r: 8, c: 0 + i });
  }
}

// 37 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate37(cb: EnumerateCallback) {
  // 1) Top extension most (4 cells) – row 1
  for (let i = 0; i < 4; i++) {
    await cb({ kind: 'topExtMost', index: 33 + i, r: 0, c: 2 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 1.5 + c });
  }
}


// 38 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate38(cb: EnumerateCallback) {
  // 1) Top extension most (4 cells) – row 1
  for (let i = 0; i < 5; i++) {
    await cb({ kind: 'topExtMost', index: 33 + i, r: 0, c: 1.5 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 1 + c });
  }
}

// 38 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate39(cb: EnumerateCallback) {
  // 1) Top extension most (4 cells) – row 1
  for (let i = 0; i < 5; i++) {
    await cb({ kind: 'topExtMost', index: 34 + i, r: 0, c: 1.5 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 1 + c });
  }
}

// 40 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate40(cb: EnumerateCallback) {
  // 1) Top extension most (4 cells) – row 1
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'topExtMost', index: 34 + i, r: 0, c: 1 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 1 + c });
  }
}

// 41 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate41(cb: EnumerateCallback) {
  // 1) Top extension most (6 cells) – row 1
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'topExtMost', index: 35 + i, r: 0, c: 1 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 0.5 + c });
  }
}

// 42 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate42(cb: EnumerateCallback) {
  // 1) Top extension most (6 cells) – row 1
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'topExtMost', index: 35 + i, r: 0, c: 0.5 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 0.5 + c });
  }
}

// 43 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate43(cb: EnumerateCallback) {
  // 1) Top extension most (6 cells) – row 1
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'topExtMost', index: 36 + i, r: 0, c: 0.5 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 0 + c });
  }
}

// 44 template: 8 columns x 10 rows (virtual), center spans 6x6
// Indices mapping:
// 0..7   -> top row (8)
// 8..13  -> left border (6)
// 14..19 -> right border (6)
// 20..27 -> bottom row (8)
// 28..35 -> bottom extension (8 centered)
export async function enumerate44(cb: EnumerateCallback) {
  // 1) Top extension most (6 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 36 + i, r: 0, c: 0 + i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x6) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 6, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 6; r++) {
    await cb({ kind: 'right', index: 14 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 20 + c, r: 8, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 28 + c, r: 9, c: 0 + c });
  }
}


export async function enumerate46(cb: EnumerateCallback) {
  // 1) Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 37 + i, r: 0, c: i });
  }
  // 2) Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // 3) Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // 4) Center (spans 6x5) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // 5) Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // 6) Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // 7) Bottom extension (8 cells) – row 9
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // 8) Bottom-most extension (4 cells, centered) – row 10,
  for (let i = 0; i < 4; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 2 + i });
  }
}

// 47 template: same base as 46, with 1 more bottom-most extension (5 total)
export async function enumerate47(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 39 + i, r: 0, c: i });
  }
  // Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // Center (spans 6x5) – starts at row 3, col 1
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // Right side (5 cells) – rows 3..7 at col 7
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // Bottom row (8 cells) – row 8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // Bottom extension (8 cells) – row 9
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // Bottom-most extension (5 cells, centered) – row 10
  for (let i = 0; i < 5; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 1.5 + i });
  }
}

// 48 template: same base as 46, with 2 more bottom-most extension (6 total)
export async function enumerate48(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 40 + i, r: 0, c: i });
  }
  // Top row (8 cells) – row 2
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left side (5 cells) – rows 3..7 at col 0
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // Center (spans 6x5)
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // Bottom row (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // Bottom-most extension (6 cells, centered)
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 1 + i });
  }
}

// 49 template: same base as 46, with 3 more bottom-most extension (7 total)
export async function enumerate49(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 41 + i, r: 0, c: i });
  }
  // Top row (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // Center
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // Bottom row (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // Bottom-most extension (7 cells, centered)
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 0.5 + i });
  }
}

// 50 template: same base as 46, with 4 more bottom-most extension (8 total)
export async function enumerate50(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 1
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 42 + i, r: 0, c: i });
  }
  // Top row (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left side (5 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 8 + r, r: 2 + r, c: 0 });
  }
  // Center
  await cb({ kind: 'center', index: -1, r: 2, c: 1, rspan: 5, cspan: 6 });
  // Right side (5 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 13 + r, r: 2 + r, c: 7 });
  }
  // Bottom row (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottom', index: 18 + c, r: 7, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 26 + c, r: 8, c });
  }
  // Bottom-most extension (8 cells, full width)
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'bottomMostExt', index: 34 + i, r: 9, c: 0 + i });
  }
}

// 51 template: same base as 46, with 4 more bottom-most extension (8 total)
export async function enumerate51(cb: EnumerateCallback) {
  // Index plan (total 51, center excluded from index count):
  // 0..8   top (9)
  // 9..18  left two cols (10)
  // 19..28 right two cols (10)
  // 29..37 bottom (9)
  // 38..44 bottomExt (7)
  // 45..50 topExtMost (6)

  // Top extension most (6 cells) – virtual row 0, centered across 9 cols → c: 1..6
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'topExtMost', index: 45 + i, r: 0, c: 1.5 + i });
  }
  // Top row (9 cells) – virtual row 1
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left side two columns (10 cells) – rows 2..6 at cols 0 and 1
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (spans 5x5) – starts at row 2, col 2
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right side two columns (10 cells) – rows 2..6 at cols 7 and 8
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells) – virtual row 7
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (7 cells, centered) – virtual row 8, cols 1..7
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'bottomExt', index: 38 + i, r: 8, c: 1 + i });
  }
}

// 52 template: 9 cols with two-column sides; bottomExt 8, topExtMost 6
export async function enumerate52(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, cols 1.5..6.5
  for (let i = 0; i < 6; i++) {
    await cb({ kind: 'topExtMost', index: 46 + i, r: 0, c: 1.5 + i });
  }
  // Top row (9 cells) – row 1
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left two columns (10 cells) – rows 2..6 at cols 0 and 1
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (5x5) – starts at row 2, col 2
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right two columns (10 cells) – rows 2..6 at cols 7 and 8
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells) – row 7
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (8 cells, centered) – row 8, cols 0.5..7.5
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'bottomExt', index: 38 + i, r: 8, c: 0.5 + i });
  }
}

// 53 template: bottomExt 9 (full), topExtMost 7
export async function enumerate53(cb: EnumerateCallback) {
  // Top extension most (7 cells) – row 0
  for (let i = 0; i < 7; i++) {
    await cb({ kind: 'topExtMost', index: 46 + i, r: 0, c: 1 + i });
  }
  // Top row (9 cells) – row 1
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left two columns (10 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right two columns (10 cells)
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (8 cells) – row 8, cols 0..8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 8, c: 0.5 + c });
  }
}

// 54 template: bottomExt 8, topExtMost 8
export async function enumerate54(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 0
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 46 + i, r: 0, c: 0.5 + i });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 8, c: 0.5 + c });
  }
}

// 55 template: bottomExt 9, topExtMost 8
export async function enumerate55(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 0, cols 0.5..7.5
  for (let i = 0; i < 8; i++) {
    await cb({ kind: 'topExtMost', index: 47 + i, r: 0, c: 0.5 + i });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 8, c });
  }
}

// 56 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate56(cb: EnumerateCallback) {
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExtMost', index: 47 + c, r: 0, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 1, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 2 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 2 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 2, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 2 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 2 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 7, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 8, c });
  }
}

// 57 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate57(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 3; c++) {
    await cb({ kind: 'topExtMost', index: 54 + c, r: 0, c: 3+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExt', index: 48 + c, r: 1, c: 1.5+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1.5+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottomMostExt', index: 44 + c, r: 10, c: 2.5+c });
  }
}

// 58 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate58(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'topExtMost', index: 54 + c, r: 0, c: 2.5+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExt', index: 48 + c, r: 1, c: 1.5+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1.5+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottomMostExt', index: 44 + c, r: 10, c: 2.5+c });
  }
}

// 59 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate59(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'topExtMost', index: 55 + c, r: 0, c: 2.5+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExt', index: 49 + c, r: 1, c: 1.5+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottomMostExt', index: 45 + c, r: 10, c: 2.5+c });
  }
}

// 60 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate60(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'topExtMost', index: 56 + c, r: 0, c: 2.5+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExt', index: 49 + c, r: 1, c: 1+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'bottomMostExt', index: 45 + c, r: 10, c: 2.5+c });
  }
}

// 61 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate61(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 4; c++) {
    await cb({ kind: 'topExtMost', index: 57 + c, r: 0, c: 2.5+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExt', index: 50 + c, r: 1, c: 1+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottomMostExt', index: 45 + c, r: 10, c: 2+c });
  }
}

// 62 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate62(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'topExtMost', index: 57 + c, r: 0, c: 2+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExt', index: 50 + c, r: 1, c: 1+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 1+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottomMostExt', index: 45 + c, r: 10, c: 2+c });
  }
}

// 63 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate63(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'topExtMost', index: 58 + c, r: 0, c: 2+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExt', index: 51 + c, r: 1, c: 1+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 2+c });
  }
}

// 64 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate64(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'topExtMost', index: 59 + c, r: 0, c: 2+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 51 + c, r: 1, c: 0.5+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 2+c });
  }
}

// 65 template: bottomExt 9, topExtMost 9 (full)
export async function enumerate65(cb: EnumerateCallback) {
  // Top extension most (3 cells) – row 0, cols 0..8
  for (let c = 0; c < 5; c++) {
    await cb({ kind: 'topExtMost', index: 60 + c, r: 0, c: 2+c });
  }
  // Top extension most (9 cells) – row 0, cols 0..8
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 52 + c, r: 1, c: 0.5+c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5+c });
  }
  // Bottom most extension (4 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 1.5+c });
  }
}

// 66 template: 9 top + 2x5 left/right + 9 bottom + 8 bottomExt + 6 bottomMostExt + 8 topExt + 6 topExtMost = 66 cells
export async function enumerate66(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 60 + c, r: 0, c: 1.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 52 + c, r: 1, c: 0.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5 + c });
  }
  // Bottom most extension (6 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 1.5 + c });
  }
}

// 67 template: 9 top + 2x5 left/right + 9 bottom + 8 bottomExt + 7 bottomMostExt + 8 topExt + 6 topExtMost = 67 cells
export async function enumerate67(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 61 + c, r: 0, c: 1.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 53 + c, r: 1, c: 0.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5 + c });
  }
  // Bottom most extension (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 1 + c });
  }
}

// 68 template: 9 top + 2x5 left/right + 9 bottom + 8 bottomExt + 7 bottomMostExt + 8 topExt + 7 topExtMost = 68 cells
export async function enumerate68(cb: EnumerateCallback) {
  // Top extension most (7 cells) – row 0, centered
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExtMost', index: 61 + c, r: 0, c: 1 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 53 + c, r: 1, c: 0.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c: 0.5 + c });
  }
  // Bottom most extension (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 46 + c, r: 10, c: 1 + c });
  }
}

// 69 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 7 bottomMostExt + 8 topExt + 7 topExtMost = 69 cells
export async function enumerate69(cb: EnumerateCallback) {
  // Top extension most (7 cells) – row 0, centered
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExtMost', index: 62 + c, r: 0, c: 1 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 54 + c, r: 1, c: 0.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c: 1 + c });
  }
}

// 70 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 7 bottomMostExt + 9 topExt + 7 topExtMost = 70 cells
export async function enumerate70(cb: EnumerateCallback) {
  // Top extension most (7 cells) – row 0, centered
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExtMost', index: 63 + c, r: 0, c: 1 + c });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 54 + c, r: 1, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c: 1 + c });
  }
}

// 71 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 9 topExt + 7 topExtMost = 71 cells
export async function enumerate71(cb: EnumerateCallback) {
  // Top extension most (7 cells) – row 0, centered
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'topExtMost', index: 64 + c, r: 0, c: 1 + c });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 55 + c, r: 1, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c: 0.5 + c });
  }
}

// 72 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 9 topExt + 8 topExtMost = 72 cells
export async function enumerate72(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 0, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExtMost', index: 64 + c, r: 0, c: 0.5 + c });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 55 + c, r: 1, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c: 0.5 + c });
  }
}

// 73 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 9 bottomMostExt + 9 topExt + 8 topExtMost = 73 cells
export async function enumerate73(cb: EnumerateCallback) {
  // Top extension most (8 cells) – row 0, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExtMost', index: 65 + c, r: 0, c: 0.5 + c });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 56 + c, r: 1, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (9 cells)  
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c });
  }
}

// 74 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 9 bottomMostExt + 9 topExt + 9 topExtMost = 74 cells
export async function enumerate74(cb: EnumerateCallback) {
  // Top extension most (9 cells) – row 0, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExtMost', index: 65 + c, r: 0, c });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 56 + c, r: 1, c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 2 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 2 + 1, r: 3 + r, c: 1 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 2, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 19 + r * 2 + 0, r: 3 + r, c: 7 });
    await cb({ kind: 'right', index: 19 + r * 2 + 1, r: 3 + r, c: 8 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 29 + c, r: 8, c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 38 + c, r: 9, c });
  }
  // Bottom most extension (9 cells)  
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomMostExt', index: 47 + c, r: 10, c });
  }
}


// 75 template: 9 top + 2x5 left/right + 9 bottom + 9 bottomExt + 9 bottomMostExt + 9 topExt + 9 topExtMost = 74 cells
export async function enumerate75(cb: EnumerateCallback) {
  // Top extension most (9 cells) – row 0, full width
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 69 + c, r: 0, c: c + 2.5 });
  }
  // Top extension (9 cells) – row 1, full width
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 61 + c, r: 1, c: c + 1.5 });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: c + 1 });
  }
  // Left two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 9 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right two columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 24 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 24 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 24 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 39 + c, r: 8, c: c + 1 });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomExt', index: 48 + c, r: 9, c: c + 2});
  }
  // Bottom most extension (9 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 55 + c, r: 10, c: c + 2.5 });
  }
}

// 76 template: 6 topExtMost + 8 topExt + 9 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 6 bottomExtMost = 76 cells
export async function enumerate76(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 70 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 62 + c, r: 1, c: 1.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 1 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 9 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 24 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 24 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 24 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 39 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 48 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 57 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (6 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 65 + c, r: 11, c: 2.5 + c });
  }
}

// 77 template: 6 topExtMost + 8 topExt + 9 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 7 bottomExtMost = 77 cells
export async function enumerate77(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 71 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 63 + c, r: 1, c: 1.5 + c });
  }
  // Top row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 1 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 9 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 9 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 9 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 24 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 24 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 24 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 39 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 48 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 57 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 65 + c, r: 11, c: 2 + c });
  }
}

// 78 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 6 bottomExtMost = 78 cells
export async function enumerate78(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 72 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 64 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 0.5 + c });
  }
  // Bottom extension (8 cells)
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomExt', index: 50 + c, r: 9, c: 1.5 + c });
  }
  // Bottom extension most (6 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 11, c: 2.5 + c });
  }
}

// 79 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 7 bottomExtMost = 79 cells
export async function enumerate79(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 73 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 65 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 0.5 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 50 + c, r: 9, c: 1 + c });
  }
  // Bottom extension most (7 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 59 + c, r: 11, c: 2 + c });
  }
}

// 80 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 7 bottomExtMost = 79 cells
export async function enumerate80(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 74 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 65 + c, r: 1, c: 1 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 0.5 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 50 + c, r: 9, c: 1 + c });
  }
  // Bottom extension most (7 cells)  
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'bottomMostExt', index: 59 + c, r: 11, c: 2 + c });
  }
}

// 80 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 7 bottomExtMost = 79 cells
export async function enumerate81(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 74 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'topExt', index: 65 + c, r: 1, c: 1 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 0.5 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 50 + c, r: 9, c: 1 + c });
  }
  // Bottom extension most (7 cells)  
  for (let c = 0; c < 7; c++) {
    await cb({ kind: 'bottomMostExt', index: 59 + c, r: 11, c: 2 + c });
  }
}

// 82 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 10 bottomExtMost = 82 cells
export async function enumerate82(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 76 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 68 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (10 cells)  
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: 0.5 + c });
  }
}

// 83 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 11 bottomExtMost = 83 cells
export async function enumerate83(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 77 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 69 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (11 cells)  
  for (let c = 0; c < 11; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: c });
  }
}

// 84 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 12 bottomExtMost = 84 cells
export async function enumerate84(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 78 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 70 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (12 cells)  
  for (let c = 0; c < 12; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -0.5 + c });
  }
}

// 85 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 13 bottomExtMost = 85 cells
export async function enumerate85(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 79 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 71 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (13 cells)  
  for (let c = 0; c < 13; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -1 + c });
  }
}

// 86 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 14 bottomExtMost = 86 cells
export async function enumerate86(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 80 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 72 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (14 cells)  
  for (let c = 0; c < 14; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -1.5 + c });
  }
}

// 87 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 15 bottomExtMost = 87 cells
export async function enumerate87(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 81 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 73 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (15 cells)  
  for (let c = 0; c < 15; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -2 + c });
  }
}

// 88 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 16 bottomExtMost = 88 cells
export async function enumerate88(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 82 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 74 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (16 cells)  
  for (let c = 0; c < 16; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -2.5 + c });
  }
}

// 89 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 17 bottomExtMost = 89 cells
export async function enumerate89(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 83 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 75 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (17 cells)  
  for (let c = 0; c < 17; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -3 + c });
  }
}

// 90 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 18 bottomExtMost = 90 cells
export async function enumerate90(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 84 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 76 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (18 cells)  
  for (let c = 0; c < 18; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -3.5 + c });
  }
}

// 91 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 19 bottomExtMost = 91 cells
export async function enumerate91(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 85 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 77 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (19 cells)  
  for (let c = 0; c < 19; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -4 + c });
  }
}

// 92 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 20 bottomExtMost = 92 cells
export async function enumerate92(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 86 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 78 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (20 cells)  
  for (let c = 0; c < 20; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -4.5 + c });
  }
}

// 93 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 21 bottomExtMost = 93 cells
export async function enumerate93(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 87 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 79 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (21 cells)  
  for (let c = 0; c < 21; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -5 + c });
  }
}

// 94 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 22 bottomExtMost = 94 cells
export async function enumerate94(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 88 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 80 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (22 cells)  
  for (let c = 0; c < 22; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -5.5 + c });
  }
}

// 95 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 23 bottomExtMost = 95 cells
export async function enumerate95(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 89 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 81 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (23 cells)  
  for (let c = 0; c < 23; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -6 + c });
  }
}

// 96 template: 6 topExtMost + 8 topExt + 10 top + 3x5 left/right + 9 bottom + 9 bottomExt + 8 bottomMostExt + 24 bottomExtMost = 96 cells
export async function enumerate96(cb: EnumerateCallback) {
  // Top extension most (6 cells) – row 0, centered
  for (let c = 0; c < 6; c++) {
    await cb({ kind: 'topExtMost', index: 90 + c, r: 0, c: 2.5 + c });
  }
  // Top extension (8 cells) – row 1, centered
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'topExt', index: 82 + c, r: 1, c: 1.5 + c });
  }
  // Top row (10 cells)
  for (let c = 0; c < 10; c++) {
    await cb({ kind: 'top', index: c, r: 2, c: 0.5 + c });
  }
  // Left three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'left', index: 10 + r * 3 + 0, r: 3 + r, c: 0 });
    await cb({ kind: 'left', index: 10 + r * 3 + 1, r: 3 + r, c: 1 });
    await cb({ kind: 'left', index: 10 + r * 3 + 2, r: 3 + r, c: 2 });
  }
  // Center (5x5)
  await cb({ kind: 'center', index: -1, r: 3, c: 3, rspan: 5, cspan: 5 });
  // Right three columns
  for (let r = 0; r < 5; r++) {
    await cb({ kind: 'right', index: 25 + r * 3 + 0, r: 3 + r, c: 8 });
    await cb({ kind: 'right', index: 25 + r * 3 + 1, r: 3 + r, c: 9 });
    await cb({ kind: 'right', index: 25 + r * 3 + 2, r: 3 + r, c: 10 });
  }
  // Bottom row (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottom', index: 40 + c, r: 8, c: 1 + c });
  }
  // Bottom extension (9 cells)
  for (let c = 0; c < 9; c++) {
    await cb({ kind: 'bottomExt', index: 49 + c, r: 9, c: 1 + c });
  }
  // Bottom most extension (8 cells)  
  for (let c = 0; c < 8; c++) {
    await cb({ kind: 'bottomMostExt', index: 58 + c, r: 10, c: 1.5 + c });
  }
  // Bottom extension most (24 cells)  
  for (let c = 0; c < 24; c++) {
    await cb({ kind: 'bottomMostExt', index: 66 + c, r: 11, c: -6.5 + c });
  }
}

