export const compareObjects = (objectA, objectB) => {
  const keysA = Object.keys(objectA) || [];
  const keysB = Object.keys(objectB) || [];

  if (keysA.length !== keysB.length) {
    return false;
  }

  for (const key of keysA) {
    if (!keysB.includes(key) || objectA[key] !== objectB[key]) {
      return false;
    }
  }

  return true;
};
