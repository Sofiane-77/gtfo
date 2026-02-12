import { isoWeekUTC_fromDateReused } from "./date";

export interface PasswordOptions {
    length?: number; // default 10
    groupSize?: number; // default 5, 0 => désactive
    alphabet?: string; // default A-Z + 0-9
  }
  
  const DEFAULT_SEED = 0x05e23baf; // 98712495
  
  /**
   * Factory : réutilise un Date interne (moins d'alloc si appelé très souvent).
   */
  export default function createPasswordGenerator() {
    const d = new Date(0);
  
    return function generatePassword(
      input: number | Date = Date.now(),
      {
        length = 10,
        groupSize = 5,
        alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890",
      }: PasswordOptions = {}
    ): string {
      const alphaLen = alphabet.length | 0;
  
      length = length | 0;
      if (length <= 0) return "";
  
      groupSize = groupSize | 0;
  
      // --- date UTC ---
      if (typeof input === "number") d.setTime(input);
      else d.setTime(input.getTime());
  
      const year = d.getUTCFullYear() | 0;
      const week = isoWeekUTC_fromDateReused(d) | 0;
  
      // --- seed = hash2(DEFAULT_SEED, year, week) (inline) ---
      let r = (DEFAULT_SEED + 374761401 + Math.imul(year, -1028477379)) >>> 0;
      r =
        (Math.imul((r >>> 15) | Math.imul(r, 131072), 668265263) +
          Math.imul(week, -1028477379)) >>>
        0;
      r = Math.imul((r >>> 15) | Math.imul(r, 131072), 668265263) >>> 0;
      r = Math.imul((r >>> 15) ^ r, -2048144777) >>> 0;
      r = Math.imul((r >>> 13) ^ r, -1028477379) >>> 0;
      const seed = (((r >>> 16) ^ r) >>> 0) | 0; // |0 pour rester int32 dans la suite
  
      // --- output buffer ---
      const dashCount = groupSize > 0 ? (((length - 1) / groupSize) | 0) : 0; // floor
      const out = new Array<string>(length + (dashCount > 0 ? dashCount : 0));
  
      let outPos = 0;
  
      for (let i = 0; i < length; i++) {
        // dash à 5,10,... mais pas juste avant la fin (comme tes fichiers)
        if (groupSize > 0 && i !== 0 && i % groupSize === 0 && i < length - 1) {
          out[outPos++] = "-";
        }
  
        // --- hash1(seed, i) inline ---
        let h = (seed + 374761397 + Math.imul(i, -1028477379)) >>> 0;
        h = Math.imul((h >>> 15) | Math.imul(h, 131072), 668265263) >>> 0;
        h = Math.imul((h >>> 15) ^ h, -2048144777) >>> 0;
        h = Math.imul((h >>> 13) ^ h, -1028477379) >>> 0;
        h = ((h >>> 16) ^ h) >>> 0;
  
        // même logique que JS: int32 -> abs -> modulo
        let idx = h | 0;
        idx = idx < 0 ? -idx : idx;
        idx = idx % alphaLen;
  
        out[outPos++] = alphabet.charAt(idx);
      }
  
      return out.join("");
    };
  }
  

  