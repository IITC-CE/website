#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

from jinja2 import Environment, FileSystemLoader
import os

from pages import index as page_index
from pages import download_desktop as page_download_desktop
from pages import __filelist__ as page_filelist
from pages import __utils__ as page_utils


def generate_page(page):
    template = env.get_template(page)

    markers = {'active_page': page}
    if page == 'index.html':
        widget = page_index.get_telegram_widget("iitc_news")
        if widget is None:
            print("Error updating telegram")
            return
        markers['telegram_widget'] = widget
        markers['screenshots_carousel'] = page_index.get_screenshots_carousel()

    if page in ["download_desktop.html", "download_mobile.html"]:
        markers.update(page_utils.get_meta_markers())

    if page == "download_desktop.html":
        markers.update(page_download_desktop.get_zip_file_names())

    html = template.render(markers)
    path = "static/" + page
    with open(path, "w") as fh:
        fh.write(html)


if __name__ == '__main__':
    env = Environment(
        loader=FileSystemLoader("template"),
        trim_blocks=True
    )
    env.filters['md5sum'] = page_utils.file_add_md5sum

    page_utils.copy_last_build_from_archive()
    page_filelist.recursive_generate_index_pages(env)

    files = os.listdir("template")
    files = filter(lambda x: x.endswith(".html"), files)

    for _page in files:
        if _page.startswith("_"):
            continue
        generate_page(_page)
