const carouselData = new WeakMap();
 
function initInfiniteCarousel(selector) {
  const slider = document.querySelector(selector);
  if (!slider) return;

  const gap = parseInt(getComputedStyle(slider).gap) || 0;

  let data = carouselData.get(slider);
  if (!data) {
    data = {
      dragAttached: false,
      scrollHandler: null,
      resizeAttached: false,
      isDragging: false,
    };
    carouselData.set(slider, data);
  }

  // --- originals ---
  const existingOriginals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));
  if (existingOriginals.length) {
    Array.from(slider.children).forEach(el => {
      if (!el.hasAttribute('data-original')) slider.removeChild(el);
    });
  } else {
    Array.from(slider.children).forEach(el => el.setAttribute('data-original', 'true'));
  }
  const originals = Array.from(slider.children).filter(el => el.hasAttribute('data-original'));

  // --- del old scroll handler ---
  if (data.scrollHandler) slider.removeEventListener('scroll', data.scrollHandler);

  // --- count of copies ---
  const totalOriginalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
  let copies = 1;
  while (totalOriginalWidth * copies < slider.clientWidth * 3) copies++;

  // --- clones ---
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

  // --- original borders ---
  const totalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
  const leftBoundary = totalWidth * copies;          
  const rightBoundary = totalWidth * (copies + 1);   
  const totalWidthAll = totalWidth * (2 * copies + 1); 

  // --- Drag and rescroll ---
  if (!data.dragAttached) {
    let isDown = false;          
    let startX, scrollLeft;      
    let touchStartY = 0;         
    let isHorizontalDrag = false; 

    const startDrag = (pageX) => {
      isDown = true;
      startX = pageX;
      scrollLeft = slider.scrollLeft;
    };

    const moveDrag = (pageX) => {
      if (!isDown) return;
      slider.scrollLeft = scrollLeft + (startX - pageX);
    };

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      data.isDragging = false;   
      isHorizontalDrag = false;  

      // Distance to edge
      if (slider.scrollLeft < slider.clientWidth) {
        slider.scrollLeft += totalWidth;
      } else if (slider.scrollLeft > totalWidthAll - slider.clientWidth) {
        slider.scrollLeft -= totalWidth;
      }
    };

    // --- Mouse ---
    slider.addEventListener('mousedown', (e) => {
      startDrag(e.pageX);
      data.isDragging = true;  
    });
    window.addEventListener('mouseup', endDrag);
    slider.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();        
      moveDrag(e.pageX);
    });

    // --- Touch ---
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

      // Check drag direction
      if (!isHorizontalDrag && !data.isDragging) {
        if (dx > 5 || dy > 5) {
          if (dx > dy) {
            isHorizontalDrag = true;
            data.isDragging = true;
            e.preventDefault(); 
          } else {
            isDown = false;      
            data.isDragging = false;
           
            return;
          }
        } else {
          return;
        }
      }

      // Horizontal drag
      if (isHorizontalDrag) {
        e.preventDefault(); 
        moveDrag(touch.pageX);
      }
    }, { passive: false });

    slider.addEventListener('touchend', endDrag);
    slider.addEventListener('touchcancel', endDrag);

    data.dragAttached = true;
  }

  // --- infinity ---
  const scrollHandler = () => {
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
