const toggleBtn = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');
const backdrop = document.getElementById('backdrop');

const desktopMq = window.matchMedia('(min-width: 900px)');

function setSidebarState(open) {
  if (desktopMq.matches) {
    sidebar.classList.add('open');
    sidebar.setAttribute('aria-hidden', 'false');
    toggleBtn.setAttribute('aria-expanded', 'true');
    backdrop.hidden = true;
    return;
  }

  sidebar.classList.toggle('open', open);
  sidebar.setAttribute('aria-hidden', String(!open));
  toggleBtn.setAttribute('aria-expanded', String(open));
  backdrop.hidden = !open;
}

function toggleSidebar() {
  const isOpen = sidebar.classList.contains('open');
  setSidebarState(!isOpen);
}

toggleBtn.addEventListener('click', toggleSidebar);
backdrop.addEventListener('click', () => setSidebarState(false));
window.addEventListener('resize', () => setSidebarState(false));

setSidebarState(false);
