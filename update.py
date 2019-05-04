"""
Usage:
  main.py --template=<path> --static=<path> --config=FILE --page=<pg> [--meta]

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
        html = html[html.find('<div class="tgme_widget_message js-widget_message"'):]
        html = html[:html.find('<script')]
        return html


def save_meta(data, release_type):
    # File to store full information about categories and plugins
    path_build_meta = arguments['--static'] + "/" + release_type + ".json"
    with open(path_build_meta, "w") as fp:
        json.dump(data, fp, indent=1)

    # File to store the release number of different builds
    path_updates_meta = arguments['--static'] + "/updates.json"
    if os.path.isfile(path_updates_meta):
        with open(path_updates_meta, 'r') as fp:
            updates_data = json.load(fp)
    else:
        updates_data = {}

    updates_data[release_type] = data[release_type+'_iitc_version']

    with open(path_updates_meta, "w") as fp:
        json.dump(updates_data, fp)


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
        if arguments['--meta']:
            save_meta(data, "release")

    if page == 'test_builds.html':
        data = parse_build('test')
        markers.update(data)
        if arguments['--meta']:
            save_meta(data, "test")

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
