const portrait = document.querySelector('.portrait-flip');

function showIllustration(show) {
  portrait.setAttribute('aria-pressed', String(show));
}

portrait.addEventListener('pointerenter', event => {
  if (event.pointerType === 'mouse') showIllustration(true);
});
portrait.addEventListener('pointerleave', event => {
  if (event.pointerType === 'mouse') showIllustration(false);
});
portrait.addEventListener('click', event => {
  if (event.pointerType === 'mouse' && event.detail > 0) return;
  showIllustration(portrait.getAttribute('aria-pressed') !== 'true');
});

const navbar = document.querySelector('.navbar');

function positionBiography(details) {
  const frame = details.closest('.team-card-photo').getBoundingClientRect();
  const anchor = details.querySelector('.bio-trigger').getBoundingClientRect();
  const bubble = details.querySelector('.team-bio-bubble');
  const viewport = document.documentElement;
  const margin = 12;
  const gap = 8;
  const topEdge = Math.max(margin, navbar.getBoundingClientRect().bottom + gap);
  const bottomEdge = viewport.clientHeight - margin;

  if (anchor.bottom < topEdge || anchor.top > bottomEdge) {
    details.open = false;
    return;
  }

  bubble.dataset.side = 'above';
  const width = bubble.getBoundingClientRect().width;
  const centerX = anchor.left + anchor.width / 2;
  const centerY = anchor.top + anchor.height / 2;
  const fitsRight = anchor.right + gap + width <= viewport.clientWidth - margin;
  const fitsLeft = anchor.left - gap - width >= margin;
  let left, top, arrowAt;
  if (fitsRight || fitsLeft) {
    bubble.dataset.side = fitsRight ? 'right' : 'left';
    bubble.style.setProperty('--bio-space', (bottomEdge - topEdge - 2) + 'px');
    const height = bubble.getBoundingClientRect().height;
    left = fitsRight ? anchor.right + gap : anchor.left - gap - width;
    top = Math.max(topEdge, Math.min(centerY - height / 2, bottomEdge - height));
    arrowAt = Math.max(12, Math.min(centerY - top, height - 12));
  } else {
    const above = anchor.top - gap - topEdge;
    const below = bottomEdge - anchor.bottom - gap;
    const showAbove = above >= below;
    bubble.dataset.side = showAbove ? 'above' : 'below';
    bubble.style.setProperty('--bio-space', (Math.max(above, below) - 2) + 'px');
    left = Math.max(margin, Math.min(centerX - width / 2, viewport.clientWidth - width - margin));
    top = showAbove ? anchor.top - gap - bubble.getBoundingClientRect().height : anchor.bottom + gap;
    arrowAt = Math.max(12, Math.min(centerX - left, width - 12));
  }
  bubble.style.left = (left - frame.left) + 'px';
  bubble.style.top = (top - frame.top) + 'px';
  bubble.style.setProperty('--arrow-at', arrowAt + 'px');
}

document.querySelectorAll('.team-bio').forEach(details => {
  details.addEventListener('focusout', event => {
    if (!details.contains(event.relatedTarget)) details.open = false;
  });
  details.addEventListener('toggle', () => {
    if (details.open) positionBiography(details);
  });
});

function repositionOpenBiography() {
  const details = document.querySelector('.team-bio[open]');
  if (details) positionBiography(details);
}
window.addEventListener('resize', repositionOpenBiography);
window.addEventListener('scroll', repositionOpenBiography, { passive: true });
document.addEventListener('pointerdown', event => {
  const details = document.querySelector('.team-bio[open]');
  if (details && !details.contains(event.target)) details.open = false;
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  const details = document.querySelector('.team-bio[open]');
  if (!details) return;
  if (details.contains(document.activeElement)) details.querySelector('summary').focus({ preventScroll: true });
  details.open = false;
});
