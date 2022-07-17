#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

from jinja2 import Environment, FileSystemLoader
import urllib.request
import json
import os
import urllib.parse
import hashlib
import shutil
import glob
from datetime import datetime
from bs4 import BeautifulSoup


def md5sum(filename, blocksize=65536):
    hash = hashlib.md5()
    with open(filename, "rb") as f:
        for block in iter(lambda: f.read(blocksize), b""):
            hash.update(block)
    return hash.hexdigest()


def file_add_md5sum(filename):
    return filename+"?"+md5sum("static/"+filename)


def parse_meta(release_type):
    meta_path = f"static/build/{release_type}/meta.json"
    with open(meta_path, 'r') as fm:
        meta = json.load(fm)

    ret = dict()
    ret[release_type + '_iitc_version'] = meta["iitc_version"]
    ret[release_type + '_categories'] = meta["categories"]
    return ret


def get_all_in_one_zip_file_names():
    ret = dict()
    for release_type in ["release", "beta"]:
        build_path = f"static/build/{release_type}/"
        files = os.listdir(build_path)
        files = list(filter(lambda x: x.endswith(".zip"), files))

        if len(files) > 0:
            ret[release_type] = files[0]
        else:
            ret[release_type] = ""
    return {"all_in_one_zip_file": ret}


def get_telegram_widget(channel):
    url = f"https://t.me/s/{channel}"
    response = urllib.request.urlopen(url, timeout=10)
    soup = BeautifulSoup(response.read(), 'html5lib')

    posts = soup.find('section', class_='tgme_channel_history').findChildren('div', recursive=False)
    last_post = posts[-1]
    return last_post


def get_screenshots_carousel():
    screenshots = []
    for file in os.listdir('./static/img/screenshots/'):
        if not file.endswith('.html'):
            screenshots.append("img/screenshots/"+file)
    return screenshots


def generate_page(page):
    template = env.get_template(page)

    markers = {'active_page': page}
    if page == 'index.html':
        widget = get_telegram_widget("iitc_news")
        if widget is None:
            print("Error updating telegram")
            return
        markers['telegram_widget'] = widget
        markers['screenshots_carousel'] = get_screenshots_carousel()

    if page == "download_desktop.html":
        data = parse_meta('release')
        data.update(parse_meta('beta'))
        data.update(get_all_in_one_zip_file_names())
        markers.update(data)

    if page == "download_mobile.html":
        data = parse_meta('release')
        data.update(parse_meta('beta'))
        markers.update(data)

    html = template.render(markers)
    path = "static/" + page
    with open(path, "w") as fh:
        fh.write(html)


def copy_last_build_from_archive():
    for release_type in ["release", "beta"]:
        build_path = f"static/build/{release_type}"
        builds_archive_path = f"static/build/{release_type}_archive"

        archives = [f for f in os.listdir(builds_archive_path) if os.path.isdir(os.path.join(builds_archive_path, f))]
        last_build = sorted(archives)[-1]

        if os.path.exists(build_path):
            shutil.rmtree(build_path)
        shutil.copytree(f"{builds_archive_path}/{last_build}", build_path)


def get_files_tree():
    root = "static/"
    tree = {}
    for file_path in glob.iglob('static/**', recursive=True):
        file_path = file_path.replace(root, "")
        file_dir = "/".join(file_path.split("/")[:-1])
        if file_dir not in tree:
            tree[file_dir] = []
        file_name = file_path.split("/")[-1]
        tree[file_dir].append(file_name)
    if "" in tree:
        del tree[""]
    return tree


def sizeof_fmt(num, suffix="B"):
    for unit in ["", "Ki", "Mi", "Gi", "Ti", "Pi", "Ei", "Zi"]:
        if abs(num) < 1024.0:
            return f"{num:3.1f} {unit}{suffix}"
        num /= 1024.0
    return f"{num:.1f} Yi{suffix}"


def recursive_generate_index_pages():
    tree = get_files_tree()

    for file_dir in tree:
        file_dir_split = file_dir.split("/")

        marker_path_menu = []
        marker_files = []
        for i, split_dir in enumerate(file_dir_split):
            marker_path_menu.append(["../"*(len(file_dir_split)-i-1), split_dir])

        for file in tree[file_dir]:
            if file == "index.html":
                continue

            file_path = f"{file_dir}/{file}"
            static_file_path = "static/"+file_path
            file_is_dir = os.path.isdir(static_file_path)
            file_size = os.path.getsize(static_file_path) if not file_is_dir else "-1"
            file_size_fmt = sizeof_fmt(file_size) if not file_is_dir else "&mdash;"
            modified = os.path.getmtime(static_file_path)
            file_modified = datetime.fromtimestamp(modified).strftime("%Y-%m-%dT%H:%M:%SZ")
            file_modified_fmt = datetime.fromtimestamp(modified).strftime("%Y-%m-%d %H:%M:%S")

            marker_files.append({
                "is_dir": file_is_dir,
                "name": file,
                "path": f"./{file}",
                "size": file_size,
                "size_fmt": file_size_fmt,
                "modified": file_modified,
                "modified_fmt": file_modified_fmt
            })

        markers = {
            "path": "/"+file_dir,
            "path_menu": marker_path_menu,
            "files": marker_files,
            "count_dirs": sum(x['is_dir'] is True for x in marker_files),
            "count_files": sum(x['is_dir'] is False for x in marker_files)
        }
        template = env.get_template("__folder_index__.html")
        html = template.render(markers)
        path = f"static/{file_dir}/index.html"
        with open(path, "w") as fh:
            fh.write(html)


if __name__ == '__main__':
    env = Environment(
        loader=FileSystemLoader("template"),
        trim_blocks=True
    )
    env.filters['md5sum'] = file_add_md5sum

    copy_last_build_from_archive()
    recursive_generate_index_pages()

    files = os.listdir("template")
    files = filter(lambda x: x.endswith(".html"), files)

    for _page in files:
        if _page.startswith("_"):
            continue
        generate_page(_page)
