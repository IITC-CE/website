#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
import json
import hashlib
import shutil
import time
import urllib.request


def md5sum(filename, blocksize=65536):
    hash = hashlib.md5()
    with open(filename, "rb") as f:
        for block in iter(lambda: f.read(blocksize), b""):
            hash.update(block)
    return hash.hexdigest()


def file_add_md5sum(filename):
    return filename+"?"+md5sum("static/"+filename)


def get_meta_markers():
    data = dict()
    for release_type in ["release", "beta"]:
        meta_path = f"static/build/{release_type}/meta.json"
        with open(meta_path, 'r') as fm:
            meta = json.load(fm)
            data[release_type + '_iitc_version'] = meta["iitc_version"]
            for category in meta["categories"]:
                if "plugins" in meta["categories"][category]:
                    for i, plugin in enumerate(meta["categories"][category]['plugins']):
                        meta["categories"][category]['plugins'][i][f"{release_type}_version"] = meta["categories"][category]['plugins'][i]["version"]
                        del meta["categories"][category]['plugins'][i]["version"]
            data[release_type + '_categories'] = meta["categories"]

    data['categories'] = data['release_categories']
    # Adding categories of beta plugins, if such categories are not in the release
    for beta_category in data['beta_categories']:
        if beta_category not in data['categories']:
            data['categories'][beta_category] = data['beta_categories'][beta_category]

    for category in data['categories']:
        if 'plugins' not in data['release_categories'][category]:
            data['release_categories'][category]['plugins'] = []
        if 'plugins' not in data['beta_categories'][category]:
            data['beta_categories'][category]['plugins'] = []

        # If the plugin has a beta version, then adding the beta version number
        for release_plugin in data['release_categories'][category]['plugins']:
            for beta_plugin in data['beta_categories'][category]['plugins']:
                if release_plugin['id'] == beta_plugin['id']:
                    release_plugin['beta_version'] = beta_plugin[f"beta_version"]
                    break

        # If the plugin is not in the release, then add the plugin from the beta
        for beta_plugin in data['beta_categories'][category]['plugins']:
            is_in_release = False
            for release_plugin in data['release_categories'][category]['plugins']:
                if beta_plugin['id'] == release_plugin['id']:
                    is_in_release = True
                    break
            if not is_in_release:
                data['categories'][category]['plugins'].append(beta_plugin)

    del data['release_categories']
    del data['beta_categories']
    return data


def copy_last_build_from_archive():
    for release_type in ["release", "beta"]:
        build_path = f"static/build/{release_type}"
        builds_archive_path = f"static/build/{release_type}_archive"

        archives = [f for f in os.listdir(builds_archive_path) if os.path.isdir(os.path.join(builds_archive_path, f))]
        last_build = sorted(archives)[-1]

        if os.path.exists(build_path):
            shutil.rmtree(build_path)
        shutil.copytree(f"{builds_archive_path}/{last_build}", build_path)


def load_page_with_retries(url, max_retries=3, timeout=10):
    for attempt in range(max_retries):
        try:
            response = urllib.request.urlopen(url, timeout=timeout)
            return response
        except Exception as e:
            print(f"Attempt {attempt + 1} of {max_retries} failed: {e}")
            if attempt < max_retries - 1:
                time.sleep(10)  # Delay before the next attempt
            else:
                return None
