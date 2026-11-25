// Hand-drawn flat food icons for the Thanksgiving dinner items, one SVG <g> per Farm Bureau item on a 64 x 64 grid. Drawn
// because Unicode has no cranberry, stuffing or whipped cream emoji; a full set keeps the style even. The insight page and
// the dataset repo's shareable chart (thanksgiving-basket/build-afbf.mjs) both use this file.
const C = { outline: "#5b4636", plate: "#e3e6e8", rim: "#c9ced2" };

const turkey = `
  <ellipse cx="32" cy="50" rx="29" ry="8" fill="${C.plate}" stroke="${C.rim}" stroke-width="1.5"/>
  <g transform="rotate(-38 14 30)"><ellipse cx="14" cy="30" rx="9" ry="5" fill="#9a4f1c"/><rect x="2" y="28.5" width="6" height="3" rx="1.5" fill="#f4ead6"/><circle cx="3" cy="28" r="2.4" fill="#f4ead6"/><circle cx="3" cy="32" r="2.4" fill="#f4ead6"/></g>
  <g transform="rotate(38 50 30)"><ellipse cx="50" cy="30" rx="9" ry="5" fill="#9a4f1c"/><rect x="56" y="28.5" width="6" height="3" rx="1.5" fill="#f4ead6"/><circle cx="61" cy="28" r="2.4" fill="#f4ead6"/><circle cx="61" cy="32" r="2.4" fill="#f4ead6"/></g>
  <ellipse cx="32" cy="38" rx="21" ry="14" fill="#b8641f"/>
  <ellipse cx="32" cy="34" rx="16" ry="9" fill="#cf7a2c"/>
  <ellipse cx="26" cy="30" rx="7" ry="3.2" fill="#e8a05a" opacity=".8"/>`;

const pumpkinPie = `
  <rect x="17" y="12" width="30" height="42" rx="3" fill="#d5d9dc" stroke="#aab1b6" stroke-width="1.5"/>
  <ellipse cx="32" cy="12" rx="15" ry="3.5" fill="#eef0f1" stroke="#aab1b6" stroke-width="1.5"/>
  <rect x="17" y="21" width="30" height="24" fill="#e2761f"/>
  <ellipse cx="32" cy="34" rx="8.5" ry="7" fill="#f6a344"/>
  <path d="M28 28c0 4 0 9 0 12M36 28c0 4 0 9 0 12" stroke="#e2761f" stroke-width="1.4" fill="none"/>
  <rect x="31" y="24.5" width="2.4" height="4" rx="1" fill="#3f7d2a"/>`;

const milk = `
  <path d="M22 20 L22 14 Q22 11 25 11 L39 11 Q42 11 42 14 L42 20 L47 27 L47 54 Q47 57 44 57 L20 57 Q17 57 17 54 L17 27 Z" fill="#ffffff" stroke="#aab1b6" stroke-width="1.8"/>
  <rect x="27" y="6" width="10" height="6" rx="1.5" fill="#d63b2f"/>
  <path d="M42 22 Q53 24 50 36 Q48 41 45 40" fill="none" stroke="#aab1b6" stroke-width="3"/>
  <rect x="17.9" y="34" width="28.2" height="11" fill="#2f6fb5"/>
  <path d="M22 39.5h20" stroke="#ffffff" stroke-width="2"/>`;

const veggieTray = `
  <rect x="5" y="40" width="54" height="14" rx="7" fill="#b07a43"/>
  <rect x="5" y="40" width="54" height="5" rx="2.5" fill="#c9935a"/>
  ${[10, 15, 20, 25].map((x, i) => `<rect x="${x}" y="${16 + (i % 2) * 3}" width="4" height="${26 - (i % 2) * 3}" rx="2" fill="#f07c1b" transform="rotate(${-8 + i * 4} ${x + 2} 40)"/>`).join("")}
  ${[34, 39, 44, 49].map((x, i) => `<rect x="${x}" y="${15 + (i % 2) * 3}" width="4.5" height="${27 - (i % 2) * 3}" rx="1.5" fill="#8cc152" transform="rotate(${-6 + i * 4} ${x + 2} 40)"/><rect x="${x + 0.8}" y="${15 + (i % 2) * 3}" width="1.4" height="${27 - (i % 2) * 3}" fill="#b5dc85" transform="rotate(${-6 + i * 4} ${x + 2} 40)"/>`).join("")}`;

const roll = (cx, cy, r) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 0.82}" fill="#c98a3e"/><ellipse cx="${cx}" cy="${cy - r * 0.18}" rx="${r * 0.82}" ry="${r * 0.55}" fill="#e0a85c"/><ellipse cx="${cx - r * 0.3}" cy="${cy - r * 0.35}" rx="${r * 0.3}" ry="${r * 0.16}" fill="#f2cd8f"/>`;
const rolls = `<ellipse cx="32" cy="52" rx="28" ry="6" fill="${C.plate}" stroke="${C.rim}" stroke-width="1.5"/>${roll(20, 42, 11)}${roll(44, 42, 11)}${roll(32, 30, 12)}`;

const pieCrusts = `
  <ellipse cx="32" cy="40" rx="28" ry="16" fill="#aab1b6"/>
  ${Array.from({ length: 18 }, (_, i) => { const a = (i / 18) * Math.PI * 2; return `<circle cx="${(32 + Math.cos(a) * 25).toFixed(1)}" cy="${(37 + Math.sin(a) * 13.5).toFixed(1)}" r="4.2" fill="#e3bb78"/>`; }).join("")}
  <ellipse cx="32" cy="37" rx="22" ry="11.5" fill="#f1dcae"/>
  <ellipse cx="32" cy="38.5" rx="18" ry="8.5" fill="#ead0a0"/>`;

const peas = `
  <path d="M6 34 Q32 36 58 34 Q56 56 32 57 Q8 56 6 34 Z" fill="#e8f2e4" stroke="#b8cdb2" stroke-width="1.5"/>
  ${[[14, 32], [21, 30], [28, 29], [35, 29], [42, 30], [49, 32], [17, 26], [24, 24], [31, 23], [38, 24], [45, 26], [27, 18.5], [34, 18.5], [21, 33], [42, 33]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.4" fill="#5da130"/><circle cx="${x - 1.4}" cy="${y - 1.5}" r="1.3" fill="#9fd06a"/>`).join("")}`;

const cranberries = `
  <path d="M10 44 Q32 46 54 44 Q52 58 32 58 Q12 58 10 44 Z" fill="#f4f4f4" stroke="#c4c8cb" stroke-width="1.5"/>
  ${[[18, 40], [26, 41], [34, 41], [42, 40], [48, 42], [22, 33], [30, 33], [38, 33], [45, 35], [26, 25.5], [34, 25.5], [16, 44]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="5.4" fill="#b0122c"/><circle cx="${x}" cy="${y}" r="5.4" fill="url(#cb)"/><circle cx="${x - 1.8}" cy="${y - 2}" r="1.3" fill="#ffffff" opacity=".75"/>`).join("")}
  <path d="M38 16 Q46 10 52 14 Q46 20 38 16 Z" fill="#4c8c2b"/>`;

const whippingCream = `
  <path d="M8 42 Q32 44 56 42 Q54 58 32 58 Q10 58 8 42 Z" fill="#ececec" stroke="#c4c8cb" stroke-width="1.5"/>
  <path d="M12 42 Q12 33 22 33 Q20 25 30 24 Q31 15 38 12 Q36 20 42 24 Q50 26 47 33 Q54 35 52 42 Z" fill="#ffffff" stroke="#c9cdd0" stroke-width="1.6"/>
  <path d="M18 38 Q28 35 40 37 M24 30 Q32 28 40 30" fill="none" stroke="#d9dcde" stroke-width="1.6"/>`;

const sweetPotatoes = `
  <g transform="rotate(-28 26 34)"><ellipse cx="26" cy="34" rx="20" ry="9" fill="#8f3b4a"/><ellipse cx="22" cy="31" rx="9" ry="2.5" fill="#a8566a" opacity=".8"/></g>
  <g transform="rotate(22 40 42)"><ellipse cx="40" cy="42" rx="19" ry="9" fill="#9c4152"/><ellipse cx="52" cy="40.6" rx="7.5" ry="8.4" fill="#f08a2a"/><ellipse cx="52" cy="40.6" rx="5" ry="6" fill="#f7a64e"/></g>`;

const stuffing = `
  <rect x="5" y="26" width="54" height="30" rx="7" fill="#f3f3f3" stroke="#bfc4c8" stroke-width="1.6"/>
  <rect x="9" y="29" width="46" height="23" rx="4" fill="#9a6331"/>
  ${[[11, 30], [19, 31], [27, 29.5], [35, 31], [43, 30], [49, 31.5], [14, 38], [23, 39], [31, 37.5], [40, 39], [47, 38.5], [12, 45], [20, 46], [29, 45], [38, 46.5], [46, 45]].map(([x, y], i) => `<rect x="${x}" y="${y}" width="7" height="6.5" rx="1.2" fill="${["#d99a4f", "#c7843c", "#e5b06a"][i % 3]}" transform="rotate(${(i * 23) % 30 - 15} ${x + 3.5} ${y + 3})"/>`).join("")}
  ${[[17, 36], [33, 34], [44, 44], [25, 50]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="2.2" ry="1.1" fill="#4f8a2c"/>`).join("")}`;

const misc = `
  <path d="M18 20 L46 20 L50 56 Q50 58 48 58 L16 58 Q14 58 14 56 Z" fill="#efe3c8" stroke="#bda97f" stroke-width="1.6"/>
  <path d="M18 20 Q32 12 46 20" fill="#e2d2ad" stroke="#bda97f" stroke-width="1.6"/>
  <rect x="21" y="33" width="22" height="13" rx="2" fill="#2f6fb5"/>
  <path d="M25 39.5h14" stroke="#ffffff" stroke-width="2"/>
  <rect x="40" y="44" width="20" height="10" rx="2" fill="#f6d35b" stroke="#d6ac2c" stroke-width="1.4"/>`;

const total = `
  <circle cx="32" cy="34" r="22" fill="#ffffff" stroke="${C.rim}" stroke-width="2"/>
  <circle cx="32" cy="34" r="15" fill="none" stroke="${C.plate}" stroke-width="2"/>
  <path d="M5 14v12M8 14v12M2 14v12M5 26v28" stroke="#8a9095" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M60 14 Q55 22 58 32 L59 54" fill="none" stroke="#8a9095" stroke-width="3" stroke-linecap="round"/>`;

export const DEFS = `<defs><radialGradient id="cb" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#e03a52" stop-opacity=".9"/><stop offset="1" stop-color="#7d0a1d" stop-opacity="0"/></radialGradient></defs>`;
export const ICONS = { turkey, pumpkinPie, milk, veggieTray, rolls, pieCrusts, peas, cranberries, whippingCream, sweetPotatoes, stuffing, misc, total };
