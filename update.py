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


def save_config():
    with open(arguments['--config'], 'w') as _f:
        json.dump(config, _f)


def parse_user_script(path):
    data = {}
    with open(path) as file:
        for line in file:
            if "==UserScript==" in line:
                continue
            if "==/UserScript==" in line:
                return data

            line = line.strip()
            sp = line.split()
            data[sp[1]] = ' '.join(sp[2:])


def parse_build(release_type):
    data = {
        "Portal Info": {'name': "Portal Info",
                        'desc': "Enhanced information on the selected portal",
                        'plugins': []},
        "Info": {'name': "Info",
                 'desc': "Display additional information",
                 'plugins': []},
        "Keys": {'name': "Keys",
                 'desc': "Manual key management",
                 'plugins': []},
        "Controls": {'name': "Controls",
                     'desc': "Map controls/widgets",
                     'plugins': []},
        "Highlighter": {'name': "Highlighter",
                        'desc': "Portal highlighters",
                        'plugins': []},
        "Layer": {'name': "Layer",
                  'desc': "Additional map layers",
                  'plugins': []},
        "Map Tiles": {'name': "Map Tiles",
                      'desc': "Alternative map layers",
                      'plugins': []},
        "Tweaks": {'name': "Tweaks",
                   'desc': "Adjust IITC settings",
                   'plugins': []},
        "Misc": {'name': "Misc",
                 'desc': "Unclassified plugins",
                 'plugins': []},
        "Obsolete": {'name': "Obsolete",
                     'desc': "Plugins that are no longer recommended, due to being superceded by others or similar",
                     'plugins': []},
        "Deleted": {'name': "Deleted",
                    'desc': "Deleted plugins - listed here for reference only. No download available",
                    'plugins': []},
    }

    folder = arguments['--static'] + "/build/" + release_type + "/"
    info = parse_user_script(folder + "total-conversion-build.user.js")
    iitc_version = info['@version']

    plugins = os.listdir(folder + "plugins")
    plugins = filter(lambda x: x.endswith('.user.js'), plugins)
    for filename in plugins:
        info = parse_user_script(folder + "plugins/" + filename)
        category = info.get('@category')
        if category:
            category = re.sub('[^A-z0-9 -]', '', category).strip()
        else:
            category = "Misc"

        if category not in data:
            data[category] = {
                'name': category,
                'desc': "",
                'plugins': []}

        data[category]['plugins'].append({
            'name': info['@name'].replace("IITC plugin: ", "").replace("IITC Plugin: ", ""),
            'id': info['@id'],
            'version': info['@version'],
            'filename': filename,
            'desc': info['@description'],
        })

    data = sort_categories(data)
    data = sort_plugins(data)
    return {
        release_type+'_plugins': data,
        release_type+'_iitc_version': iitc_version
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
        html = html[html.find('<div class="tgme_widget_message"'):]
        html = html[:html.find('<script')]
        return html


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

    if page == 'download_desktop.html':
        data = parse_build('release')
        markers.update(data)

    if page == 'test_builds.html':
        data = parse_build('test')
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
        files = filter(lambda x: x.endswith('.html'), files)
    else:
        files = [arguments['--page'] + '.html']

    for _page in files:
        if _page == "__base__.html":
            continue
        generate_page(_page)
