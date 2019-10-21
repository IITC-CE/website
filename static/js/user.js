function scrollToElement(element) {
    if (!element) return;

    let to = element.getBoundingClientRect().top;
    let from = window.pageYOffset;

    window.scrollTo(0, from + to | 0);
}

document.addEventListener('DOMContentLoaded', function() {
    let sidenav_elems = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav_elems, {});

    M.Carousel.init(document.querySelectorAll('.carousel'), {indicators: true});

    let collapsible_elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collapsible_elems, {});

    if(window.location.hash) {
        // Waiting for tile sorting by masonry library and anchor position correction.
        // Several masonry instances are running, making it difficult to determine if all the work has been completed.
        setTimeout(function(){
            let target_element = document.getElementById(window.location.hash.split('#')[1]);
            scrollToElement(target_element);
        }, 1000);
    }
});