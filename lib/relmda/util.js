
export const trace = (...rest) => console.log(...rest);
export const pretty = obj => JSON.stringify(obj, null, "  ");
export const compact = obj => JSON.stringify(obj);

