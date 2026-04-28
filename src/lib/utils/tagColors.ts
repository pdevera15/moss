const PALETTE = [
  { dot: '#c4a84a', text: '#7a6a3b' },
  { dot: '#5b8fa8', text: '#3b5c6e' },
  { dot: '#9b7ac4', text: '#5e4a7a' },
  { dot: '#5a9465', text: '#3b6840' },
  { dot: '#c47a7a', text: '#7a3b3b' },
  { dot: '#5aaa96', text: '#3b6458' },
  { dot: '#8a8880', text: '#5a5850' },
  { dot: '#c4884e', text: '#8a5c2e' },
  { dot: '#b47a9a', text: '#6e4a5e' },
  { dot: '#5a7ab8', text: '#3b4e6e' },
  { dot: '#a89a6e', text: '#6a5a3e' },
  { dot: '#6aaa8a', text: '#4a6e5a' },
  { dot: '#7ab4c4', text: '#3b6470' },
  { dot: '#c4b07a', text: '#7a6040' },
  { dot: '#8ab45a', text: '#4a6a2e' },
  { dot: '#c46e9a', text: '#7a3a58' },
  { dot: '#6a8ac4', text: '#3a4e7a' },
  { dot: '#c4946a', text: '#7a5030' },
  { dot: '#6ac4b4', text: '#3a6e64' },
  { dot: '#a47ab4', text: '#5e3e6e' },
  { dot: '#b4c46a', text: '#6a7030' },
  { dot: '#c4746e', text: '#7a3830' },
  { dot: '#6ab4a4', text: '#3a6458' },
  { dot: '#8a7ac4', text: '#4a3e7a' },
]

function hashTag(tag: string): number {
  let h = 0
  for (const c of tag) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return h
}

export function getTagColors(tag: string) {
  const p = PALETTE[hashTag(tag) % PALETTE.length]
  return { dot: p.dot, text: p.text, bg: p.dot + '20' }
}
