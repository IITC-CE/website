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


def save_config():
    with open(arguments['--config'], 'w') as _f:
        json.dump(config, _f, indent=1)


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


def parse_build(release_type):
    data = {
        "Portal Info": {'name': "Portal Info",
                        'name:ru': "Информация о портале",
                        'description': "Enhanced information on the selected portal",
                        'description:ru': "Подробная информация на выбранном портале",
                        'plugins': []},
        "Info": {'name': "Info",
                 'name:ru': "Информация",
                 'description': "Display additional information",
                 'description:ru': "Отображение дополнительной информации",
                 'plugins': []},
        "Keys": {'name': "Keys",
                 'name:ru': "Ключи",
                 'description': "Manual key management",
                 'description:ru': "Ручное управление ключами",
                 'plugins': []},
        "Cache": {'name': "Cache",
                  'name:ru': "Кэш",
                  'description': "Data caching to prevent reloading",
                  'description:ru': "Кэширование данных для предотвращения повторной загрузки",
                  'plugins': []},
        "Controls": {'name': "Controls",
                     'name:ru': "Управление",
                     'description': "Map controls/widgets",
                     'description:ru': "Виджеты для управления картой",
                     'plugins': []},
        "Draw": {'name': "Draw",
                 'name:ru': "Рисование",
                 'description': "Allow drawing things onto the current map so you may plan your next move",
                 'description:ru': "Позволяет рисовать на текущей карте, чтобы вы могли спланировать свой следующий шаг",
                 'plugins': []},
        "Highlighter": {'name': "Highlighter",
                        'name:ru': "Подсветка",
                        'description': "Portal highlighters",
                        'description:ru': "Подсветка порталов",
                        'plugins': []},
        "Layer": {'name': "Layer",
                  'name:ru': "Слои",
                  'description': "Additional map layers",
                  'description:ru': "Дополнительные слои карт",
                  'plugins': []},
        "Map Tiles": {'name': "Map Tiles",
                      'name:ru': "Провайдеры карт",
                      'description': "Alternative map layers",
                      'description:ru': "Альтернативные провайдеры карт",
                      'plugins': []},
        "Tweaks": {'name': "Tweaks",
                   'name:ru': "Настройки",
                   'description': "Adjust IITC settings",
                   'description:ru': "Настройка параметров IITC",
                   'plugins': []},
        "Misc": {'name': "Misc",
                 'name:ru': "Разное",
                 'description': "Unclassified plugins",
                 'description:ru': "Неклассифицированные плагины",
                 'plugins': []},
        "Obsolete": {'name': "Obsolete",
                     'name:ru': "Устаревшее",
                     'description': "Plugins that are no longer recommended, due to being superceded by others or similar",
                     'description:ru': "Плагины, которые больше не рекомендуются в связи с заменой другими или аналогичными плагинами",
                     'plugins': []},
        "Deleted": {'name': "Deleted",
                    'name:ru': "Удалённое",
                    'description': "Deleted plugins – listed here for reference only. No download available",
                    'description:ru': "Удаленные плагины – перечислены здесь только для справки. Нет возможности скачать",
                    'plugins': []},
    }

    folder = arguments['--static'] + "/build/" + release_type + "/"
    iitc_meta = parse_user_script(folder + "total-conversion-build.user.js")
    iitc_version = iitc_meta['version']

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
    return {
        'categories': data,
        'iitc_version': iitc_version
    }


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

    if page in ["download_desktop.html", "download_mobile.html"]:
        data = parse_build('release')
        markers.update(data)

    if page == 'test_builds.html':
        data = parse_build('test')
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

    if arguments['--page'] == "all":
        files = os.listdir(arguments['--template'])
        files = filter(lambda x: x.endswith(".html"), files)
    else:
        files = [arguments['--page'] + ".html"]

    for _page in files:
        if _page.startswith("_"):
            continue
        generate_page(_page)
