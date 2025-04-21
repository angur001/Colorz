// composables/useColorDifference.ts

export type RGBColor = {
    r: number
    g: number
    b: number
  }
  
  export function useColorDifference() {
    const rgbToXyz = (r: number, g: number, b: number): [number, number, number] => {
      r = r / 255
      g = g / 255
      b = b / 255
  
      r = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92
      g = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92
      b = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92
  
      const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) * 100
      const y = (r * 0.2126 + g * 0.7152 + b * 0.0722) * 100
      const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) * 100
  
      return [x, y, z]
    }
  
    const xyzToLab = (x: number, y: number, z: number): [number, number, number] => {
      const refX = 95.047
      const refY = 100.0
      const refZ = 108.883
  
      x /= refX
      y /= refY
      z /= refZ
  
      const f = (v: number) => v > 0.008856 ? Math.cbrt(v) : (7.787 * v) + (16 / 116)
  
      const fx = f(x)
      const fy = f(y)
      const fz = f(z)
  
      const L = (116 * fy) - 16
      const a = 500 * (fx - fy)
      const b = 200 * (fy - fz)
  
      return [L, a, b]
    }
  
    const calculateColorDifference = (source: RGBColor, target: RGBColor): number => {
      const [x1, y1, z1] = rgbToXyz(source.r, source.g, source.b)
      const [x2, y2, z2] = rgbToXyz(target.r, target.g, target.b)
  
      const [L1, a1, b1_] = xyzToLab(x1, y1, z1)
      const [L2, a2, b2_] = xyzToLab(x2, y2, z2)
  
      const deltaE = Math.sqrt(
        Math.pow(L1 - L2, 2) +
        Math.pow(a1 - a2, 2) +
        Math.pow(b1_ - b2_, 2)
      )
  
      const maxDeltaE = 100
      const score = Math.max(0, Math.round(100 - (deltaE / maxDeltaE) * 100))
      return score
    }
  
    return { calculateColorDifference }
  }
  