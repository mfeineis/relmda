import _indexOf from './_indexOf.js';


export default function _contains(a, list) {
  return _indexOf(list, a, 0) >= 0;
}
