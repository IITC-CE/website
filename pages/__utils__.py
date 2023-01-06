#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
import json
import hashlib
import shutil


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


def copy_last_build_from_archive():
    for release_type in ["release", "beta"]:
        build_path = f"static/build/{release_type}"
        builds_archive_path = f"static/build/{release_type}_archive"

        archives = [f for f in os.listdir(builds_archive_path) if os.path.isdir(os.path.join(builds_archive_path, f))]
        last_build = sorted(archives)[-1]

        if os.path.exists(build_path):
            shutil.rmtree(build_path)
        shutil.copytree(f"{builds_archive_path}/{last_build}", build_path)
