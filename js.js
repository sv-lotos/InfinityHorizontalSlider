const carouselData = new WeakMap();

function initInfiniteCarousel(selector, infinite = true, autoSpeed = 0) {
  const sliders = document.querySelectorAll(selector);
  if (!sliders.length) return;

  sliders.forEach(slider => {
    initSingleCarousel(slider, infinite, autoSpeed);
  });

  function initSingleCarousel(slider, infinite, autoSpeed) {
    const gap = parseInt(getComputedStyle(slider).gap) || 0;

    let data = carouselData.get(slider);
    if (!data) {
      data = {
        dragAttached: false,
        scrollHandler: null,
        resizeAttached: false,
        autoFrame: null,
        autoPaused: false,
        autoDirection: 1,
        autoSpeedAbs: 0,
        isMouseOver: false
      };
      carouselData.set(slider, data);
    }

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth < 768;
    const copiesMultiplier = isMobile ? 8 : 3; 

    let speedPxPerSec = 0;
    if (typeof autoSpeed === 'string' && autoSpeed.endsWith('%')) {
      const percent = parseFloat(autoSpeed);
      if (!isNaN(percent)) speedPxPerSec = (slider.clientWidth * percent) / 100;
    } else if (typeof autoSpeed === 'number') {
      speedPxPerSec = autoSpeed;
    }
    const absSpeed = Math.abs(speedPxPerSec);
    data.autoSpeedAbs = absSpeed;
    data.autoDirection = speedPxPerSec >= 0 ? 1 : -1;

    let originals = [], totalWidth = 0, leftBoundary = 0, rightBoundary = 0, totalWidthAll = 0, copies = 0;

    if (infinite) {
      const existingOriginals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));
      if (existingOriginals.length) {
        Array.from(slider.children).forEach(el => {
          if (!el.hasAttribute('data-original')) slider.removeChild(el);
        });
      } else {
        Array.from(slider.children).forEach(el => el.setAttribute('data-original', 'true'));
      }
      originals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));
      if (data.scrollHandler) slider.removeEventListener('scroll', data.scrollHandler);

      const totalOriginalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
      copies = 1;
      while (totalOriginalWidth * copies < slider.clientWidth * copiesMultiplier) copies++;

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

      totalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
      leftBoundary = totalWidth * copies;
      rightBoundary = totalWidth * (copies + 1);
      totalWidthAll = totalWidth * (2 * copies + 1);

      const scrollHandler = () => {
        if (slider.scrollLeft < leftBoundary) slider.scrollLeft += totalWidth;
        else if (slider.scrollLeft > rightBoundary) slider.scrollLeft -= totalWidth;
      };
      slider.addEventListener('scroll', scrollHandler);
      data.scrollHandler = scrollHandler;

      requestAnimationFrame(() => {
        const firstWidth = originals[0].offsetWidth;
        slider.scrollLeft = leftBoundary + firstWidth / 2 - slider.clientWidth / 2;
        if (absSpeed) startAutoScroll();
      });
    } else {
      if (data.scrollHandler) {
        slider.removeEventListener('scroll', data.scrollHandler);
        data.scrollHandler = null;
      }
      if (absSpeed) setTimeout(() => startAutoScroll(), 50);
    }

    let lastTimestamp = 0, remainder = 0;

    function stopAutoScroll() {
      if (data.autoFrame) {
        cancelAnimationFrame(data.autoFrame);
        data.autoFrame = null;
      }
    }

    function startAutoScroll() {
      if (!absSpeed || data.autoPaused) return;
      stopAutoScroll();
      lastTimestamp = 0;
      remainder = 0;

      function step(now) {
        if (!absSpeed || data.autoPaused) {
          data.autoFrame = null;
          return;
        }
        if (!lastTimestamp) lastTimestamp = now;
        const delta = Math.min(100, now - lastTimestamp);
        if (delta > 0) {
          let deltaPx = (absSpeed * delta) / 1000;
          if (data.autoDirection < 0) deltaPx = -deltaPx;
          let totalDelta = deltaPx + remainder;
          let intDelta = Math.trunc(totalDelta);
          remainder = totalDelta - intDelta;
          if (intDelta !== 0) {
            let newLeft = slider.scrollLeft + intDelta;
            if (infinite) {
              if (newLeft < leftBoundary) newLeft += totalWidth;
              else if (newLeft > rightBoundary) newLeft -= totalWidth;
              slider.scrollLeft = newLeft;
            } else {
              const maxScroll = slider.scrollWidth - slider.clientWidth;
              if (newLeft < 0) {
                newLeft = -newLeft;
                data.autoDirection = 1;
              } else if (newLeft > maxScroll) {
                newLeft = maxScroll - (newLeft - maxScroll);
                data.autoDirection = -1;
              }
              slider.scrollLeft = newLeft;
            }
          }
        }
        lastTimestamp = now;
        data.autoFrame = requestAnimationFrame(step);
      }
      data.autoFrame = requestAnimationFrame(step);
    }

    function pauseAutoScroll() {
      if (!data.autoPaused && absSpeed) {
        data.autoPaused = true;
        stopAutoScroll();
      }
    }
    function resumeAutoScroll() {
      if (data.autoPaused && absSpeed && !data.isMouseOver) {
        data.autoPaused = false;
        startAutoScroll();
      }
    }
    function forceResumeAutoScroll() {
      if (data.autoPaused && absSpeed) {
        data.autoPaused = false;
        startAutoScroll();
      }
    }

    if (!data.dragAttached) {
      let isDown = false, startX, scrollLeft, touchStartY = 0, isHorizontalDrag = false, dragHappened = false;

      const startDrag = (pageX) => {
        isDown = true;
        startX = pageX;
        scrollLeft = slider.scrollLeft;
        dragHappened = false;
        pauseAutoScroll();
      };
      const moveDrag = (pageX) => {
        if (!isDown) return;
        if (Math.abs(pageX - startX) > 3) dragHappened = true;
        slider.scrollLeft = scrollLeft + (startX - pageX);
      };
      const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        isHorizontalDrag = false;
        if (infinite) {
          if (slider.scrollLeft < slider.clientWidth) slider.scrollLeft += totalWidth;
          else if (slider.scrollLeft > totalWidthAll - slider.clientWidth) slider.scrollLeft -= totalWidth;
        }
        setTimeout(() => { dragHappened = false; }, 100);
        if (!data.isMouseOver) resumeAutoScroll();
      };
      const clickPreventer = (e) => {
        if (dragHappened) {
          e.preventDefault();
          e.stopPropagation();
          dragHappened = false;
        }
      };
      slider.addEventListener('click', clickPreventer, true);

      slider.addEventListener('mousedown', (e) => startDrag(e.pageX));
      window.addEventListener('mouseup', endDrag);
      slider.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        moveDrag(e.pageX);
      });

      slider.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartY = touch.pageY;
        startDrag(touch.pageX);
        isHorizontalDrag = false;
      }, { passive: true });
      slider.addEventListener('touchmove', (e) => {
        if (!isDown) return;
        const touch = e.touches[0];
        const dx = Math.abs(touch.pageX - startX);
        const dy = Math.abs(touch.pageY - touchStartY);
        if (!isHorizontalDrag) {
          if (dx > 5 || dy > 5) {
            if (dx > dy) {
              isHorizontalDrag = true;
              e.preventDefault();
            } else {
              isDown = false;
              return;
            }
          } else return;
        }
        if (isHorizontalDrag) {
          e.preventDefault();
          if (dx > 3) dragHappened = true;
          moveDrag(touch.pageX);
        }
      }, { passive: false });
      slider.addEventListener('touchend', endDrag);
      slider.addEventListener('touchcancel', endDrag);

      data.dragAttached = true;
    }

    slider.addEventListener('mouseenter', () => {
      data.isMouseOver = true;
      pauseAutoScroll();
    });
    slider.addEventListener('mouseleave', () => {
      data.isMouseOver = false;
      if (!isDown) forceResumeAutoScroll();
    });

    const allChildren = slider.querySelectorAll('*');
    allChildren.forEach(el => {
      el.setAttribute('draggable', 'false');
      el.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
      });
    });

    if (!data.resizeAttached) {
      window.addEventListener('resize', () => initInfiniteCarousel(selector, infinite, autoSpeed));
      data.resizeAttached = true;
    }
  }
}
