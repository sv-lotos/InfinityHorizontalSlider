const carouselData = new WeakMap();

function initInfiniteCarousel(selector) {
	const slider = document.querySelector(selector);
	if (!slider) return;

	const gap = parseInt(getComputedStyle(slider).gap) || 0;

	// get slider from WeakMap or create it
	let data = carouselData.get(slider);
	if (!data) {
		data = { dragAttached: false, scrollHandler: null };
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

	// --- delete old scroll handler ---
	if (data.scrollHandler) slider.removeEventListener('scroll', data.scrollHandler);

	// --- quantity of copies ---
	const totalOriginalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
	let copies = 1;
	while (totalOriginalWidth * copies < slider.clientWidth * 3) copies++;

	// --- clone and del data-original ---
	for (let i=0; i<copies; i++) originals.forEach(el => { const c=el.cloneNode(true); c.removeAttribute('data-original'); slider.appendChild(c); });
	for (let i=0; i<copies; i++) [...originals].reverse().forEach(el => { const c=el.cloneNode(true); c.removeAttribute('data-original'); slider.insertBefore(c, slider.firstChild); });

	// --- drag ---
	if (!data.dragAttached) {
		let isDown=false, startX, scrollLeft;
		slider.addEventListener('mousedown', e => { isDown=true; startX=e.pageX; scrollLeft=slider.scrollLeft; });
		window.addEventListener('mouseup', ()=>isDown=false);
		slider.addEventListener('mousemove', e => { if(!isDown) return; e.preventDefault(); slider.scrollLeft=scrollLeft+(startX-e.pageX); });
		slider.addEventListener('touchstart', e=>{ startX=e.touches[0].pageX; scrollLeft=slider.scrollLeft; }, {passive:true});
		slider.addEventListener('touchmove', e=>{ const x=e.touches[0].pageX; slider.scrollLeft=scrollLeft+(startX-x); }, {passive:false});
		data.dragAttached=true;
	}

	// --- infinity ---
	const totalWidth = originals.reduce((sum, el) => sum + el.offsetWidth + gap, 0);
	const scrollHandler = () => {
		if (slider.scrollLeft < totalWidth) slider.scrollLeft += totalWidth*2;
		else if (slider.scrollLeft > totalWidth*3) slider.scrollLeft -= totalWidth*2;
	};
	slider.addEventListener('scroll', scrollHandler);
	data.scrollHandler = scrollHandler;

	// --- center ---
	requestAnimationFrame(()=>{
		const leftCopiesWidth = totalWidth*copies;
		const firstWidth = originals[0].offsetWidth;
		slider.scrollLeft = leftCopiesWidth + firstWidth/2 - slider.clientWidth/2;
	});
	
	// --- resize ---
	if (!data.resizeAttached) {
		window.addEventListener('resize', () => initInfiniteCarousel(selector));
		data.resizeAttached = true;
	}
}
