/* Hearing room renders (blender/sidang.py) and where the five judge seats appear in them, as frame fractions. */
export const RUANG = {
  desktop: { gambar: 'assets/sidang-desktop.webp', ratio: 1.7777777777777777, kursi: [{"u": 0.8642, "v": 0.4684}, {"u": 0.6799, "v": 0.4667}, {"u": 0.4972, "v": 0.465}, {"u": 0.3162, "v": 0.4633}, {"u": 0.1368, "v": 0.4616}] },
  phone: { gambar: 'assets/sidang-phone.webp', ratio: 0.5625, kursi: [{"u": 0.8735, "v": 0.4898}, {"u": 0.6845, "v": 0.4892}, {"u": 0.4971, "v": 0.4886}, {"u": 0.3115, "v": 0.4881}, {"u": 0.1275, "v": 0.4875}], posY: 0.45 }
};

/* Position of a seat inside a box that shows the image with background-size:100% auto, cropped vertically at posY. Returns percents. */
export function posisiDiKotak({ u, v }, { imgRatio, boxRatio, posY }) {
  const imgH = 1 / imgRatio, boxH = 1 / boxRatio, off = (imgH - boxH) * posY;
  return { left: Math.round(u * 10000) / 100, top: Math.round(((v * imgH - off) / boxH) * 10000) / 100 };
}
