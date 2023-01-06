#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
import glob
from datetime import datetime


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


def recursive_generate_index_pages(env):
    tree = get_files_tree()

    for file_dir in tree:
        file_dir_split = file_dir.split("/")

        marker_path_menu = []
        marker_files = []
        for i, split_dir in enumerate(file_dir_split):
            marker_path_menu.append(["../"*(len(file_dir_split)-i-1), split_dir])

        for file in sorted(tree[file_dir]):
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
