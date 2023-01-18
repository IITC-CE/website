#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os


def get_zip_file_names():
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
