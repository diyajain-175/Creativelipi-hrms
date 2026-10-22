export function collection(list) {
  return {
    all: () => list,
    findById: (id) => list.find((row) => row.id === id) || null,
    find: (pred) => list.filter(pred),
    findOne: (pred) => list.find(pred) || null,
    insert(row) {
      list.push(row);
      return row;
    },
    update(id, patch) {
      const idx = list.findIndex((row) => row.id === id);
      if (idx === -1) return null;
      list[idx] = { ...list[idx], ...patch };
      return list[idx];
    },
  };
}
