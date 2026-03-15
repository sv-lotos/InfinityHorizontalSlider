const carouselData = new WeakMap();

function initInfiniteCarousel(selector) {
  const slider = document.querySelector(selector);
  if (!slider) return;

  const gap = parseInt(getComputedStyle(slider).gap) || 0;

  let data = carouselData.get(slider);
  if (!data) {
    data = { dragAttached: false, scrollHandler: null, resizeAttached: false };
    carouselData.set(slider, data);
  }

  // --- originals ---
  const existingOriginals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));
  if (existingOriginals.length) {
    Array.from(slider.children).forEach(el => {
      if (!el.hasAttribute('data-original')) slider.removeChild(el);
    });
  } else {
    Array.from(slider.children).forEach(el => el.setAttribute('data-original','true'));
  }
  const originals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));

  // --- del old scroll handler ---
  if (data.scrollHandler) slider.removeEventListener('scroll', data.scrollHandler);

  // --- clones count ---
  const totalOriginalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
  let copies = 1;
  while (totalOriginalWidth * copies < slider.clientWidth * 3) copies++;

  // --- clone ---
  for (let i = 0; i < copies; i++) {
    originals.forEach(el => {
      const c = el.cloneNode(true);
      c.removeAttribute('data-original');
      slider.appendChild(c);
    });
  }
  for (let i = 0; i < copies; i++) {
    [...originals].reverse().forEach(el => {
      const c = el.cloneNode(true);
      c.removeAttribute('data-original');
      slider.insertBefore(c, slider.firstChild);
    });
  }

  // --- original's border ---
  const totalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
  const leftBoundary = totalWidth * copies;          // original start
  const rightBoundary = totalWidth * (copies + 1);   // original end
  const totalWidthAll = totalWidth * (2 * copies + 1); // full width

  // --- drag  ---
  if (!data.dragAttached) {
    let isDown = false;
    let isDragging = false; 
    let startX, scrollLeft;

    const startDrag = (pageX) => {
      isDown = true;
      isDragging = true;
      startX = pageX;
      scrollLeft = slider.scrollLeft;
    };

    const moveDrag = (pageX) => {
      if (!isDown) return;
      const x = pageX;
      slider.scrollLeft = scrollLeft + (startX - x);
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      isDragging = false;

      // Check distance to border
      if (slider.scrollLeft < slider.clientWidth) {
        // Too close - change
        slider.scrollLeft += totalWidth;
      } else if (slider.scrollLeft > totalWidthAll - slider.clientWidth) {
        // Too close - change
        slider.scrollLeft -= totalWidth;
      }
    };

    // Mouse
    slider.addEventListener('mousedown', (e) => startDrag(e.pageX));
    window.addEventListener('mouseup', endDrag);
    slider.addEventListener('mousemove', (e) => {
      e.preventDefault();
      moveDrag(e.pageX);
    });

    // Touch
    slider.addEventListener('touchstart', (e) => {
      startDrag(e.touches[0].pageX);
    }, { passive: true });
    slider.addEventListener('touchmove', (e) => {
      e.preventDefault();
      moveDrag(e.touches[0].pageX);
    }, { passive: false });
    slider.addEventListener('touchend', endDrag);
    slider.addEventListener('touchcancel', endDrag);

    data.dragAttached = true;
  }

  // --- infinity ---
  const scrollHandler = () => {
    // during drug we nothing do for avoid gaps
    if (data.isDragging) return;

    if (slider.scrollLeft < leftBoundary) {
      slider.scrollLeft += totalWidth;
    } else if (slider.scrollLeft > rightBoundary) {
      slider.scrollLeft -= totalWidth;
    }
  };
  slider.addEventListener('scroll', scrollHandler);
  data.scrollHandler = scrollHandler;

  // --- center ---
  requestAnimationFrame(() => {
    const firstWidth = originals[0].offsetWidth;
    slider.scrollLeft = leftBoundary + firstWidth / 2 - slider.clientWidth / 2;
  });

  // --- resize ---
  if (!data.resizeAttached) {
    window.addEventListener('resize', () => initInfiniteCarousel(selector));
    data.resizeAttached = true;
  }
}
