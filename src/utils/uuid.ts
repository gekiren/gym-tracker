export const generateUUID = (): string => {
  if (typeof global !== 'undefined' && global.crypto && typeof global.crypto.getRandomValues === 'function') {
    try {
      const typedArray = new Uint8Array(16);
      global.crypto.getRandomValues(typedArray);
      typedArray[6] = (typedArray[6] & 0x0f) | 0x40;
      typedArray[8] = (typedArray[8] & 0x3f) | 0x80;
      const hex = Array.from(typedArray).map(b => b.toString(16).padStart(2, '0'));
      return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
    } catch (e) {
      console.warn('Failed to generate secure UUID, falling back to Math.random', e);
    }
  }
  
  let d = Date.now();
  let d2 = 0;
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    let r = Math.random() * 16;
    if (d > 0) {
      r = (d + r) % 16 | 0;
      d = Math.floor(d / 16);
    } else {
      r = (d2 + r) % 16 | 0;
      d2 = Math.floor(d2 / 16);
    }
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
};
