/* Shared navigation and return-to-top control. */
(() => {
  const header = document.querySelector('.navbar');
  const menu = document.getElementById('nav-menu');
  const toggle = document.getElementById('hamburger');

  function setMenu(open) {
    menu.classList.toggle('open', open);
    toggle.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
  }

  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  menu.addEventListener('click', () => setMenu(false));
  document.addEventListener('pointerdown', event => {
    if (!header.contains(event.target)) setMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
      setMenu(false);
      toggle.focus();
    }
  });
  matchMedia('(min-width: 1141px)').addEventListener('change', event => {
    if (event.matches) setMenu(false);
  });

  const toTop = document.querySelector('.scroll-top');
  const updateScroll = () => { toTop.hidden = window.scrollY < 420; };
  window.addEventListener('scroll', updateScroll, { passive: true });
  updateScroll();
  toTop.addEventListener('click', () => {
    header.querySelector('.nav-brand').focus({ preventScroll: true });
    window.scrollTo({ top: 0 });
  });
})();
