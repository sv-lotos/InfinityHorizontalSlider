# InfinityHorizontalSlider
Ultra light horizontal slider. Pure JS + CSS.

## How to use
HTML example:

    <div class="parent">
       <img src="someimg.jpg" />
       <img src="someimg.jpg" />
       <img src="someimg.jpg" />
       <img src="someimg.jpg" />
    </div>

Any count of children.

    document.addEventListener('DOMContentLoaded', function() {
       initInfiniteCarousel(".parent",0,24);
	});
0 - non infinity; 
24 - 24px/sec autoScroll Speed
