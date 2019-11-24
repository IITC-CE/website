#!/usr/bin/env python
# -*- coding: utf-8 -*-
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
import re
import urllib.parse
import copy
import hashlib

import box


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


def parse_user_script(path):
    data = {}
    with open(path) as file:
        for line in file:
            if "==UserScript==" in line:
                continue
            if "==/UserScript==" in line:
                return data

            sp = line.strip().split()
            data[sp[1][1:]] = ' '.join(sp[2:])


def parse_build(release_type, fields=("iitc_version", "categories")):
    ret = {}

    if "iitc_version" in fields:
        folder = arguments['--static'] + "/build/" + release_type + "/"
        iitc_meta = parse_user_script(folder + "total-conversion-build.user.js")
        iitc_version = iitc_meta['version']

        ret[release_type + '_iitc_version'] = iitc_version

    if "categories" in fields:
        data = copy.deepcopy(box.categories)
        plugins = os.listdir(folder + "plugins")
        plugins = filter(lambda x: x.endswith('.user.js'), plugins)
        for filename in plugins:
            plugin = parse_user_script(folder + "plugins/" + filename)

            plugin_id = ''
            if 'id' in plugin:
                plugin_id = plugin['id'].split("@")[0]

            plugin_author = ''
            if 'author' in plugin:
                plugin_author = plugin['author']
            elif 'id' in plugin and len(plugin['id'].split("@")) > 1:
                plugin_author = plugin['id'].split("@")[1]

            category = plugin.get('category')
            if category:
                category = re.sub('[^A-z0-9 -]', '', category).strip()
            else:
                category = "Misc"

            plugin_unique_id = plugin_id
            if len(plugin_author):
                plugin_unique_id = '_by_'.join([plugin_id, re.sub(r'[^A-z0-9_]', '', plugin_author)])

            if category not in data:
                data[category] = {
                    'name': category,
                    'description': "",
                    'plugins': []}

            plugin.update({
                'unique_id': plugin_unique_id,
                'id': plugin_id,
                'author': plugin_author,
                'filename': filename,
            })
            for key, value in plugin.items():
                if key.startswith("name") or key.startswith("description"):
                    plugin[key] = value.replace("IITC plugin: ", "").replace("IITC Plugin: ", "")

            data[category]['plugins'].append(plugin)

        data = sort_categories(data)
        data = sort_plugins(data)

        ret[release_type + '_categories'] = data

    return ret


# Sort categories alphabetically
def sort_categories(unsorted_data):
    # Categories that should always be last
    last = ["Misc", "Obsolete", "Deleted"]
    data = {}

    raw_data = sorted(unsorted_data.items())
    for category_name, category_data in raw_data:
        if category_name not in last:
            data[category_name] = category_data

    for category_name in last:
        if category_name in unsorted_data:
            data[category_name] = unsorted_data[category_name]

    return data


# Sort categories alphabetically
def sort_plugins(data):
    for category_name, category_data in data.items():
        plugins = sorted(category_data['plugins'], key=lambda x: x['name'].lower())
        data[category_name]['plugins'] = plugins
    return data


def get_telegram_widget(channel, _id):
    url = 'https://t.me/%s/%i?embed=1' % (channel, _id)
    response = urllib.request.urlopen(url, timeout=10)
    data = response.read()
    html = data.decode('utf-8')

    if "tgme_widget_message_author" in html:
        html = html[html.find('<div class="tgme_widget_message js-widget_message"'):]
        html = html[:html.find('<script')]
        return html


def minimal_markdown2html(string):
    string = string.replace("\r\n", "\n").replace("<", "&lt;").replace(">", "&gt;")
    string = re.sub('\*{3}(.+)\*{3}', '<strong>\\1</strong>', string)
    string = re.sub('\*{2}(.+)\*{2}', '<i>\\1</i>', string)
    string = re.sub('^#{1}(.+)$', '<strong>#\\1</strong>', string, flags=re.MULTILINE)
    string = string.replace("\n", "<br>")
    return string


def get_release_notes():
    url = 'https://api.github.com/repos/%s/%s/releases/latest' % ("IITC-CE", "ingress-intel-total-conversion")
    response = urllib.request.urlopen(url, timeout=10)
    data = response.read()
    data = json.loads(data)
    latest = {'name': data['name'], 'body': minimal_markdown2html(data['body']), 'date': data['published_at'].split('T')[0]}

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
        _id = config['telegram_channel_last_id']
        widget = get_telegram_widget(config['telegram_channel_name'], _id + 1)
        if widget is None:
            widget = get_telegram_widget(config['telegram_channel_name'], _id)
        else:
            config['telegram_channel_last_id'] += 1
            save_config()
        if widget is None:
            print("Error updating telegram")
            return
        markers['telegram_widget'] = widget

    if page == "download_desktop.html":
        data = parse_build('release')
        data.update(parse_build('test'))
        markers.update(data)

    if page == "download_mobile.html":
        data = parse_build('release', fields=("iitc_version"))
        data.update(parse_build('test', fields=("iitc_version")))
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
