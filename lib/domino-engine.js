export function buildBoneyard() {
  const tiles = [];
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ a, b, id: `${a}-${b}` });
    }
  }
  return shuffleArr(tiles);
}

export function shuffleArr(input) {
  const a = [...input];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function chainEnds(chain) {
  if (!chain.length) return { left: null, right: null };
  return { left: chain[0].left, right: chain[chain.length - 1].right };
}

export function canPlay(tile, chain) {
  if (!chain.length) return { left: true, right: true };
  const { left, right } = chainEnds(chain);
  return {
    left: tile.a === left || tile.b === left,
    right: tile.a === right || tile.b === right,
  };
}

export function handHasMove(hand, chain) {
  if (!chain.length) return true;
  return hand.some((t) => {
    const p = canPlay(t, chain);
    return p.left || p.right;
  });
}

export function attachTile(tile, chain, side) {
  if (!chain.length) {
    return [{
      a: tile.a, b: tile.b,
      left: tile.a, right: tile.b,
      id: tile.id, placedBy: tile.placedBy,
    }];
  }
  const { left, right } = chainEnds(chain);
  if (side === 'left') {
    const newRight = left;
    const newLeft = tile.a === left ? tile.b : tile.a;
    return [
      { a: newLeft, b: newRight, left: newLeft, right: newRight, id: tile.id, placedBy: tile.placedBy },
      ...chain,
    ];
  }
  const newLeft = right;
  const newRight = tile.a === right ? tile.b : tile.a;
  return [
    ...chain,
    { a: newLeft, b: newRight, left: newLeft, right: newRight, id: tile.id, placedBy: tile.placedBy },
  ];
}

export function tilePips(t) {
  return t.a + t.b;
}
