import isObject from 'lodash/isObject';

export const compareObjects = (objectA, objectB) => {
  const keysA = isObject(objectA) ? Object.keys(objectA) : [];
  const keysB = isObject(objectB) ? Object.keys(objectB) : [];

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
