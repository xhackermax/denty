(function(){
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function markReady(){
    document.documentElement.classList.add(reduced ? 'motion-reduced' : 'cinematic-ready');
    document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('visible'));
  }

  function interestTargets(){
    return Array.from(document.querySelectorAll([
      '.patient-profile',
      '.odonto-card',
      '.apk-arcade-card',
      '.perio-risk-panel',
      '.finance-summary',
      '.lab-work-card',
      '.setting-panel.focus',
      '.clinical-legend-card.refined'
    ].join(',')));
  }

  function enhanceMotion(){
    if (reduced || !window.gsap || !window.ScrollTrigger) {
      markReady();
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    document.documentElement.classList.add('cinematic-ready');
    const view = document.getElementById('main')?.dataset.view || '';
    const skipCinematicDepth = view === 'odontogram';
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.killTweensOf('.scroll-reveal, .interest-point, .cinematic-depth-scene *, .clinical-legend-card');

    if (skipCinematicDepth) {
      document.querySelectorAll('.interest-point').forEach(el => {
        el.classList.remove('interest-point');
        gsap.set(el, { clearProps: 'transform,opacity,visibility' });
      });
    }

    if (!skipCinematicDepth) gsap.utils.toArray('.cinematic-depth-scene').forEach(scene => {
      gsap.fromTo(scene.querySelectorAll('.depth-plane'), {
        yPercent: -8,
        rotateX: 12,
        rotateY: -10,
        scale: .94
      }, {
        yPercent: 18,
        rotateX: -10,
        rotateY: 9,
        scale: 1.08,
        ease: 'none',
        scrollTrigger: {
          trigger: scene.closest('section') || scene,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });

      gsap.fromTo(scene.querySelectorAll('.depth-line'), {
        yPercent: 20,
        rotateX: -8,
        rotateY: 12,
        opacity: .18
      }, {
        yPercent: -18,
        rotateX: 10,
        rotateY: -8,
        opacity: .42,
        ease: 'none',
        scrollTrigger: {
          trigger: scene.closest('section') || scene,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true
        }
      });
    });

    gsap.utils.toArray('.scroll-reveal').forEach((el, index) => {
      gsap.fromTo(el, {
        autoAlpha: 0,
        y: skipCinematicDepth ? 10 : 26,
        rotateX: skipCinematicDepth ? 0 : 5,
        transformPerspective: 900
      }, {
        autoAlpha: 1,
        y: 0,
        rotateX: 0,
        duration: skipCinematicDepth ? .28 : .72,
        delay: skipCinematicDepth ? 0 : Math.min(index, 8) * .025,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 92%',
          toggleActions: skipCinematicDepth ? 'play none none none' : 'play none none reverse'
        }
      });
    });

    if (!skipCinematicDepth) interestTargets().forEach((el, index) => {
      el.classList.add('interest-point');
      gsap.fromTo(el, {
        scale: .965,
        rotateX: 2,
        rotateY: index % 2 ? -1.2 : 1.2,
        transformPerspective: 1100
      }, {
        scale: 1,
        rotateX: 0,
        rotateY: 0,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          end: 'center 45%',
          scrub: .45
        }
      });
    });

    ScrollTrigger.refresh();
  }

  const observer = new MutationObserver(() => {
    clearTimeout(observer._t);
    observer._t = setTimeout(enhanceMotion, 80);
  });

  window.addEventListener('load', enhanceMotion);
  window.addEventListener('denty:render', enhanceMotion);
  observer.observe(document.getElementById('main') || document.body, { childList: true, subtree: true });
})();
