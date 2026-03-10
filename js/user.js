//@license magnet:?xt=urn:btih:0b31508aeb0634b347b8270c7bee4d411b5d4109&dn=agpl-3.0.txt AGPL-v3

document.addEventListener('DOMContentLoaded', function() {
    M.Sidenav.init(document.querySelectorAll('.sidenav'), {});
    M.Collapsible.init(document.querySelectorAll('.collapsible'), {});
    M.Modal.init(document.querySelectorAll('.modal'), {onCloseStart: fixModalScroll});
    M.Tabs.init(document.querySelectorAll('.tabs'), {});
    M.Dropdown.init(document.querySelectorAll('.dropdown-trigger'), {constrainWidth: false});
    img_lazy();

    const hash = window.location.hash;
    if (hash) {
        document.querySelector(hash)?.querySelector('.plugin-info').click();
    }
    fixSidenavIndexHref();
    initPluginsView();
});

function initPluginsView() {
    const view_buttons = document.querySelector('.section_title .title_buttons .view');
    if (view_buttons) {
        view_buttons.classList.add("show");
        const view_mode = localStorage.getItem("plugins_view_mode") || "grid";
        setPluginsViewMode(view_mode, false);
    }
}

function setPluginsViewMode(view_mode, is_save=true) {
    if (view_mode === "grid") {
        document.querySelector('.section_title .title_buttons .view .grid').classList.remove("lite");
        document.querySelector('.section_title .title_buttons .view .list').classList.add("lite");
    } else {
        document.querySelector('.section_title .title_buttons .view .grid').classList.add("lite");
        document.querySelector('.section_title .title_buttons .view .list').classList.remove("lite");
    }
    document.querySelector('body').classList.remove("plugins_view_grid");
    document.querySelector('body').classList.remove("plugins_view_list");
    document.querySelector('body').classList.add("plugins_view_" + view_mode);
    if (is_save) {
        localStorage.setItem("plugins_view_mode", view_mode);
    }
}

// Fix homepage link if the site is running on GitHub Pages or locally
function fixSidenavIndexHref() {
  const currentPath = window.location.pathname;
  const pathParts = currentPath.split('/');

  // Check if the page is not in the root directory
  // pathParts[0] will be an empty string, pathParts[1] will be the filename or folder
  if (pathParts.length > 2) {
    const sidenavIndexLink = document.querySelector('.sidenav .index a');
    if (sidenavIndexLink) {
      sidenavIndexLink.setAttribute('href', 'index.html');
    }
  }
}

function fixModalScroll() {
    document.querySelector("html").style.scrollBehavior = "auto";
    setTimeout(
        () => {
            document.querySelector("html").style.scrollBehavior = "smooth";
        },
        250
    )
}

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

function modal_move_content(plugin_info, modal_id) {
    document.getElementById(modal_id).innerHTML = plugin_info.innerHTML;
}

function init_custom_modal(plugin_unique_id, modal_id, el) {
    window.location.hash = el.id;
    const plugin_info = document.getElementById(plugin_unique_id+"_info");
    modal_move_content(plugin_info, modal_id);

    const modal_footer = document.getElementById(modal_id).parentNode.parentNode.querySelector(".modal-footer");

    set_modal_data(modal_footer, ".install-plugin", plugin_info.dataset.download);
    set_modal_data(modal_footer, ".install-plugin-release", plugin_info.dataset.downloadRelease);
    set_modal_data(modal_footer, ".install-plugin-beta", plugin_info.dataset.downloadBeta);

    set_modal_data(modal_footer, ".homepage-plugin", plugin_info.dataset.homepage);
    set_modal_data(modal_footer, ".issue-tracker-plugin", plugin_info.dataset.issueTracker);
}

function set_modal_data(modal_footer, btn_class, href) {
    modal_footer.querySelector(btn_class).href = (href) ? href : "#";
    modal_footer.querySelector(btn_class).style.display = (href) ? "inline-flex" : "none";
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
