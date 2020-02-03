//@license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-v3

document.addEventListener('DOMContentLoaded', function() {
    M.Sidenav.init(document.querySelectorAll('.sidenav'), {});
    M.Carousel.init(document.querySelectorAll('.carousel'), {indicators: true});
    M.Collapsible.init(document.querySelectorAll('.collapsible'), {});
    M.Modal.init(document.querySelectorAll('.modal'), {});
    M.Tabs.init(document.querySelectorAll('.tabs'), {});
    img_lazy();

    if (window.location.hash.endsWith("_test")) {
        document.getElementById('tab_test').click();
    }

    let plugin = $_GET("plugin");
    if (plugin && plugin.endsWith("_test")) {
        document.getElementById('tab_test').click();
        document.getElementById(plugin).querySelectorAll('.card-plugin-info')[0].click();
        history.pushState({}, document.title, window.location.href.replace(window.location.search, ""));
    }

    if (document.getElementsByClassName('remark42__counter').length) {
        comments_counter_observer();
        window.remark_config = {
            host: "https://remark42.iitc.app",
            site_id: 'store-iitc-app',
            components: ['counter']
        };
        init_remark(window.remark_config);
    }
});

// Closing modal of plugin by pressing back button
window.addEventListener('popstate', function(event) {
    if (document.getElementById('modal_info')) {
        M.Modal.getInstance(document.getElementById('modal_info')).close();
    }
});

function $_GET(key) {
    let p = window.location.search;
    p = p.match(new RegExp(key + '=([^&=]+)'));
    return p ? p[1] : false;
}

function modal_move_content(content_id, modal_id) {
    document.getElementById(modal_id).innerHTML = document.getElementById(content_id).innerHTML;
}

function init_modal_remark(plugin, el, url) {
    let name = el.querySelector(".card-plugin-name span").textContent;

    window.remark_config = {
        host: "https://remark42.iitc.app",
        site_id: 'store-iitc-app',
        components: ['embed'],
        url: url,
        page_title: name+" — "+document.title,
        theme: 'light'
    };
    init_remark(window.remark_config);
}

function init_custom_modal(plugin_unique_id, modal_id, el, url) {
    window.location.hash = el.parentNode.id;
    modal_move_content(plugin_unique_id+"_info", modal_id);

    document.getElementById("remark42").innerHTML = "";
    init_modal_remark(plugin_unique_id, el, url);
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