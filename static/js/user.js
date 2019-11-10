window.addEventListener('resize', function() { shave_reinit() });

document.addEventListener('DOMContentLoaded', function() {
    let sidenav_elems = document.querySelectorAll('.sidenav');
    M.Sidenav.init(sidenav_elems, {});

    M.Carousel.init(document.querySelectorAll('.carousel'), {indicators: true});

    let collapsible_elems = document.querySelectorAll('.collapsible');
    M.Collapsible.init(collapsible_elems, {});

    var modal_elems = document.querySelectorAll('.modal');
    M.Modal.init(modal_elems, {});

    shave_reinit();
    img_lazy();

    if (document.getElementsByClassName('remark42__counter').length) {
        comments_counter_observer();
        window.remark_config = {
            host: "https://remark42.modos189.ru",
            site_id: 'store-iitc-modos189-ru',
            components: ['counter']
        };
        init_remark(window.remark_config);
    }
});

// Shave is library that helps trim more than two lines of plugin name
function shave_reinit() {
    shave('.overflow-plugin-description', 45);
}

function modal_move_content(content_id, modal_id) {
    document.getElementById(modal_id).innerHTML = document.getElementById(content_id).innerHTML;
}

function init_modal_remark(plugin) {
    window.remark_config = {
        host: "https://remark42.modos189.ru",
        site_id: 'store-iitc-modos189-ru',
        components: ['embed'],
        url: "https://iitc.modos189.ru/shop/" + plugin,
        theme: 'light'
    };
    init_remark(window.remark_config);
}

function init_custom_modal(plugin_unique_id, modal_id) {
    window.location.hash = plugin_unique_id;
    modal_move_content(plugin_unique_id+"_info", modal_id);

    document.getElementById("remark42").innerHTML = "";
    init_modal_remark(plugin_unique_id);
}

function init_remark(remark_config) {
    (function (c) {
        for (var i = 0; i < c.length; i++) {
            var d = document, s = d.createElement('script');
            s.src = window.remark_config.host + '/web/' + c[i] + '.js';
            s.defer = true;
            (d.head || d.body).appendChild(s);
        }
    })(window.remark_config.components || ['embed']);
}

function comments_counter_observer() {
    let target = document.getElementsByClassName('remark42__counter')[0];
    const config = { characterData: true, childList: true };

    const callback = function (ob) {
        for (let el of document.getElementsByClassName('remark42__counter')) {
            el.parentElement.style.display = 'inline';
        }
    };

    const observer = new MutationObserver(callback);
    observer.observe(target, config);
}

function img_lazy() {
    (async () => {
        if ('loading' in HTMLImageElement.prototype) {
            const images = document.querySelectorAll("img.lazyload");
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        } else {
            let script = document.createElement("script");
            script.async = true;
            script.src = "js/lazysizes.min.js";
            document.body.appendChild(script);
        }
    })();
}