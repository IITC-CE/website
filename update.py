#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later
"""
Usage:
  main.py --template=<path> --static=<path> --config=FILE --page=<pg>

Options:
  -h --help
"""
from docopt import docopt
from jinja2 import Environment, FileSystemLoader
import urllib.request
import json
import os
import urllib.parse
import hashlib
from bs4 import BeautifulSoup


def save_config():
    with open(arguments['--config'], 'w') as _f:
        json.dump(config, _f, indent=1)


def md5sum(filename, blocksize=65536):
    hash = hashlib.md5()
    with open(filename, "rb") as f:
        for block in iter(lambda: f.read(blocksize), b""):
            hash.update(block)
    return hash.hexdigest()


def file_add_md5sum(filename):
    return filename+"?"+md5sum(arguments['--static']+"/"+filename)


def parse_meta(release_type):
    meta_path = "%s/build/%s/meta.json" % (arguments['--static'], release_type)
    with open(meta_path, 'r') as fm:
        meta = json.load(fm)

    ret = dict()
    ret[release_type + '_iitc_version'] = meta["iitc_version"]
    ret[release_type + '_categories'] = meta["categories"]
    return ret


def get_all_in_one_zip_file_names():
    ret = dict()
    for release_type in ["release", "beta", "test"]:
        build_path = "%s/build/%s/" % (arguments['--static'], release_type)
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


def get_release_notes():
    url = 'https://api.github.com/repos/%s/%s/releases/latest' % ("IITC-CE", "ingress-intel-total-conversion")
    req = urllib.request.Request(url)
    req.add_header('Accept', 'application/vnd.github.3.full.inertia-preview+json')
    response = urllib.request.urlopen(req, timeout=10)

    data = response.read()
    data = json.loads(data)
    latest = {'name': data['name'], 'body': data['body_html'], 'date': data['published_at'].split('T')[0]}

    if ('release_notes' in config) and len(config['release_notes']):
        if config['release_notes'][-1]['name'] != latest['name']:
            config['release_notes'].append(latest)
            save_config()
    else:
        config['release_notes'] = latest
        save_config()

    return config


def generate_page(page):
    template = env.get_template(page)

    markers = config.copy()
    markers['active_page'] = page
    if page == 'index.html':
        widget = get_telegram_widget(config['telegram_channel_name'])
        if widget is None:
            print("Error updating telegram")
            return
        markers['telegram_widget'] = widget

    if page == "download_desktop.html":
        data = parse_meta('release')
        data.update(parse_meta('beta'))
        data.update(parse_meta('test'))
        data.update(get_all_in_one_zip_file_names())
        markers.update(data)

    if page == "download_mobile.html":
        data = parse_meta('release')
        data.update(parse_meta('beta'))
        data.update(parse_meta('test'))
        markers.update(data)

    if page == 'release_notes.html':
        data = get_release_notes()
        markers.update(data)

    html = template.render(markers)
    path = arguments['--static'] + "/" + page
    with open(path, "w") as fh:
        fh.write(html)


if __name__ == '__main__':
    arguments = docopt(__doc__)

    with open(arguments['--config'], 'r') as f:
        config = json.load(f)

    env = Environment(
        loader=FileSystemLoader(arguments['--template']),
        trim_blocks=True
    )
    env.filters['md5sum'] = file_add_md5sum

    if arguments['--page'] == "all":
        files = os.listdir(arguments['--template'])
        files = filter(lambda x: x.endswith(".html"), files)
    else:
        files = [arguments['--page'] + ".html"]

    for _page in files:
        if _page.startswith("_"):
            continue
        generate_page(_page)
