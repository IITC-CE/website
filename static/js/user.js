document.addEventListener('DOMContentLoaded', function() {
    let sidenav_elems = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav_elems, {});

    M.Carousel.init(document.querySelectorAll('.carousel'), {indicators: true});

    let collapsible_elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collapsible_elems, {});

    var modal_elems = document.querySelectorAll('.modal');
    M.Modal.init(modal_elems, {});

    shave_reinit();
});

window.addEventListener('resize', function(event){
    shave_reinit();
});

// Shave is library that helps trim more than two lines of plugin name
function shave_reinit() {
    shave('.overflow-plugin-description', 45);
}

function modal_move_content(content_id, modal_id) {
    document.getElementById(modal_id).innerHTML = document.getElementById(content_id).innerHTML;
}