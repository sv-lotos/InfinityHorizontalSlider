const carouselData = new WeakMap();

function initInfiniteCarousel(selector, infinite = true, autoSpeed = 0) {
  document.querySelectorAll(selector).forEach(slider => {
    initSingleCarousel(slider, infinite, autoSpeed);
  });

  function initSingleCarousel(slider, infinite, autoSpeed) {
    const gap = parseInt(getComputedStyle(slider).gap) || 0;

    let data = carouselData.get(slider);
    if (!data) {
      data = {
        dragAttached: false,
        resizeAttached: false,
        autoFrame: null,
        autoPaused: false,
        autoDirection: 1,
        autoSpeedAbs: 0,
        isMouseOver: false,
        isDragging: false,
        isInternalScroll: false,
        leftBoundary: 0,
        rightBoundary: 0,
        totalWidth: 0,
        totalWidthAll: 0,
        scrollHandler: null,
        viewportHandler: null,
        resizeHandler: null,
        fallbackResizeTimer: null,
        mousedownHandler: null,
        mouseupHandler: null,
        mousemoveHandler: null,
        touchstartHandler: null,
        touchmoveHandler: null,
        touchendHandler: null,
        touchcancelHandler: null,
        clickPreventer: null,
        mouseenterHandler: null,
        mouseleaveHandler: null
      };
      carouselData.set(slider, data);
    }

    function cleanup() {
      if (data.autoFrame) {
        cancelAnimationFrame(data.autoFrame);
        data.autoFrame = null;
      }

      if (data.scrollHandler) {
        slider.removeEventListener('scroll', data.scrollHandler);
        data.scrollHandler = null;
      }

      if (data.mousedownHandler) {
        slider.removeEventListener('mousedown', data.mousedownHandler);
        data.mousedownHandler = null;
      }
      if (data.mouseupHandler) {
        window.removeEventListener('mouseup', data.mouseupHandler);
        data.mouseupHandler = null;
      }
      if (data.mousemoveHandler) {
        slider.removeEventListener('mousemove', data.mousemoveHandler);
        data.mousemoveHandler = null;
      }

      if (data.touchstartHandler) {
        slider.removeEventListener('touchstart', data.touchstartHandler);
        data.touchstartHandler = null;
      }
      if (data.touchmoveHandler) {
        slider.removeEventListener('touchmove', data.touchmoveHandler);
        data.touchmoveHandler = null;
      }
      if (data.touchendHandler) {
        slider.removeEventListener('touchend', data.touchendHandler);
        data.touchendHandler = null;
      }
      if (data.touchcancelHandler) {
        slider.removeEventListener('touchcancel', data.touchcancelHandler);
        data.touchcancelHandler = null;
      }

      if (data.clickPreventer) {
        slider.removeEventListener('click', data.clickPreventer, true);
        data.clickPreventer = null;
      }

      if (data.mouseenterHandler) {
        slider.removeEventListener('mouseenter', data.mouseenterHandler);
        data.mouseenterHandler = null;
      }
      if (data.mouseleaveHandler) {
        slider.removeEventListener('mouseleave', data.mouseleaveHandler);
        data.mouseleaveHandler = null;
      }

      if (data.viewportHandler && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', data.viewportHandler);
        data.viewportHandler = null;
      }

      if (data.resizeHandler) {
        window.removeEventListener('resize', data.resizeHandler);
        data.resizeHandler = null;
      }
      if (data.fallbackResizeTimer) {
        clearTimeout(data.fallbackResizeTimer);
        data.fallbackResizeTimer = null;
      }

      data.isInternalScroll = false;
      data.isDragging = false;
      data.isMouseOver = false;
      data.autoPaused = false;
      data.dragAttached = false;
      data.resizeAttached = false;
    }

    cleanup();

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

    let originals = [];
    let copies = 0;

    function getDimensions() {
      if (!infinite) return { total: 0, left: 0, right: 0, all: 0 };
      const total = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
      const left = total * copies;
      const right = total * (copies + 1);
      const all = total * (2 * copies + 1);
      return { total, left, right, all };
    }

    function correctPosition(pos) {
      if (!infinite) return pos;
      const dim = getDimensions();
      const offset = (pos - dim.left) % dim.total;
      const normalized = offset < 0 ? offset + dim.total : offset;
      return dim.left + normalized;
    }

    function setScrollLeft(value, fromDrag = false) {
      let target = value;
      if (!fromDrag && infinite) target = correctPosition(target);
      if (Math.abs(slider.scrollLeft - target) < 0.01) return;
      data.isInternalScroll = true;
      slider.scrollLeft = target;
      data.isInternalScroll = false;
    }

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
      if (data.scrollHandler) {
        slider.removeEventListener('scroll', data.scrollHandler);
        data.scrollHandler = null;
      }

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

      const scrollHandler = () => {
        if (data.isInternalScroll || data.isDragging) return;
        const current = slider.scrollLeft;
        const corrected = correctPosition(current);
        if (Math.abs(corrected - current) > 0.5) {
          setScrollLeft(corrected, false);
        }
      };
      slider.addEventListener('scroll', scrollHandler);
      data.scrollHandler = scrollHandler;

      requestAnimationFrame(() => {
        const firstWidth = originals[0].offsetWidth;
        const dim = getDimensions();
        setScrollLeft(dim.left + firstWidth / 2 - slider.clientWidth / 2, false);
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
              newLeft = correctPosition(newLeft);
            } else {
              const maxScroll = slider.scrollWidth - slider.clientWidth;
              if (newLeft < 0) {
                newLeft = -newLeft;
                data.autoDirection = 1;
              } else if (newLeft > maxScroll) {
                newLeft = maxScroll - (newLeft - maxScroll);
                data.autoDirection = -1;
              }
            }
            setScrollLeft(newLeft, false);
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
      if (data.autoPaused && absSpeed && !data.isMouseOver && !data.isDragging) {
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
        data.isDragging = true;
        startX = pageX;
        scrollLeft = slider.scrollLeft;
        dragHappened = false;
        pauseAutoScroll();
      };

      const moveDrag = (pageX) => {
        if (!isDown) return;
        if (Math.abs(pageX - startX) > 3) dragHappened = true;
        const newLeft = scrollLeft + (startX - pageX);
        setScrollLeft(newLeft, true);
      };

      const endDrag = () => {
        if (!isDown) return;
        isDown = false;
        isHorizontalDrag = false;
        data.isDragging = false;
        if (infinite) {
          const current = slider.scrollLeft;
          const corrected = correctPosition(current);
          if (Math.abs(corrected - current) > 0.5) {
            setScrollLeft(corrected, false);
          }
        }
        setTimeout(() => {
          if (!data.isMouseOver) resumeAutoScroll();
        }, 50);
        setTimeout(() => { dragHappened = false; }, 100);
      };

      const clickPreventer = (e) => {
        if (dragHappened) {
          e.preventDefault();
          e.stopPropagation();
          dragHappened = false;
        }
      };

      const mousedownHandler = (e) => {
        e.preventDefault();
        startDrag(e.pageX);
      };
      const mouseupHandler = endDrag;
      const mousemoveHandler = (e) => {
        if (!isDown) return;
        e.preventDefault();
        moveDrag(e.pageX);
      };

      const touchstartHandler = (e) => {
        const touch = e.touches[0];
        touchStartY = touch.pageY;
        startDrag(touch.pageX);
        isHorizontalDrag = false;
      };
      const touchmoveHandler = (e) => {
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
      };
      const touchendHandler = endDrag;
      const touchcancelHandler = endDrag;

      data.clickPreventer = clickPreventer;
      data.mousedownHandler = mousedownHandler;
      data.mouseupHandler = mouseupHandler;
      data.mousemoveHandler = mousemoveHandler;
      data.touchstartHandler = touchstartHandler;
      data.touchmoveHandler = touchmoveHandler;
      data.touchendHandler = touchendHandler;
      data.touchcancelHandler = touchcancelHandler;

      slider.addEventListener('click', clickPreventer, true);
      slider.addEventListener('mousedown', mousedownHandler);
      window.addEventListener('mouseup', mouseupHandler);
      slider.addEventListener('mousemove', mousemoveHandler);
      slider.addEventListener('touchstart', touchstartHandler, { passive: true });
      slider.addEventListener('touchmove', touchmoveHandler, { passive: false });
      slider.addEventListener('touchend', touchendHandler);
      slider.addEventListener('touchcancel', touchcancelHandler);

      data.dragAttached = true;
    }

    const mouseenterHandler = () => {
      data.isMouseOver = true;
      pauseAutoScroll();
    };
    const mouseleaveHandler = () => {
      data.isMouseOver = false;
      if (!data.isDragging) forceResumeAutoScroll();
    };
    data.mouseenterHandler = mouseenterHandler;
    data.mouseleaveHandler = mouseleaveHandler;
    slider.addEventListener('mouseenter', mouseenterHandler);
    slider.addEventListener('mouseleave', mouseleaveHandler);

    const allChildren = slider.querySelectorAll('*');
    allChildren.forEach(el => {
      el.setAttribute('draggable', 'false');
      el.addEventListener('dragstart', (e) => {
        e.preventDefault();
        return false;
      });
    });

    if (!data.resizeAttached) {
      if (window.visualViewport) {
        let lastWidth = window.visualViewport.width;
        const viewportHandler = () => {
          const newWidth = window.visualViewport.width;
          if (newWidth !== lastWidth) {
            lastWidth = newWidth;
            initInfiniteCarousel(selector, infinite, autoSpeed);
          }
        };
        window.visualViewport.addEventListener('resize', viewportHandler);
        data.viewportHandler = viewportHandler;
      } else {
        
        let resizeTimer;
        const fallbackHandler = () => {
          clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            initInfiniteCarousel(selector, infinite, autoSpeed);
          }, 300);
        };
        window.addEventListener('resize', fallbackHandler);
        data.resizeHandler = fallbackHandler;
        data.fallbackResizeTimer = resizeTimer;
      }
      data.resizeAttached = true;
    }
  }
}
