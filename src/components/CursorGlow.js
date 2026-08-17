// Mouse Cursor Tracking Glow Effect

export function CursorGlow() {
  return `
    <div id="cursor-glow" class="fixed pointer-events-none w-[320px] h-[320px] bg-primary/10 rounded-full blur-[100px] z-0 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-700"></div>
  `;
}

export function initCursorGlow() {
  const glow = document.getElementById('cursor-glow');
  if (!glow) return;

  window.addEventListener('mousemove', (e) => {
    glow.style.opacity = '1';
    glow.style.left = e.clientX + 'px';
    glow.style.top = e.clientY + 'px';
  });

  window.addEventListener('mouseleave', () => {
    glow.style.opacity = '0';
  });
}
