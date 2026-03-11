(function () {  
    // ── Custom cursor ──────────────────────────────────────────                 
    const dot  = document.querySelector('.cursor-dot');                            
    const ring = document.querySelector('.cursor-ring');
                                                                                   
    if (dot && ring) {
      let ringX = 0, ringY = 0;
      let dotX  = 0, dotY  = 0;

      document.addEventListener('mousemove', e => {
        dotX = e.clientX; dotY = e.clientY;
        dot.style.left = dotX + 'px';
        dot.style.top  = dotY + 'px';
      });

      (function animateRing() {
        ringX += (dotX - ringX) * 0.18;
        ringY += (dotY - ringY) * 0.18;
        ring.style.left = ringX + 'px';
        ring.style.top  = ringY + 'px';
        requestAnimationFrame(animateRing);
      })();

      const hoverables = 'a, button, [role="button"], .post-card, .about-stat,
  .name-char';
      document.querySelectorAll(hoverables).forEach(el => {
        el.addEventListener('mouseenter', () =>
  document.body.classList.add('cursor-hover'));
        el.addEventListener('mouseleave', () =>
  document.body.classList.remove('cursor-hover'));
      });

      document.addEventListener('mouseleave', () => {
        dot.style.opacity  = '0';
        ring.style.opacity = '0';
      });
      document.addEventListener('mouseenter', () => {
        dot.style.opacity  = '1';
        ring.style.opacity = '1';
      });
    }

    // ── Scroll reveal ──────────────────────────────────────────
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => e.target.classList.add('visible'), i * 80);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  })();
