import sys
import os


def store_version(_, outdir):
    import json
    import settings

    settings.version = json.loads(outdir.joinpath('meta.json').read_text(encoding='utf8'))['iitc_version']


defaults = {
    'update_file': '.meta.js',
    'url_icon_base': 'https://iitc.app/extras/plugin-icons/{}.svg',
    'post_build': [
        'build_mobile.py',
        'web_meta_gen.py',
        store_version,
        'cd "{target}" && zip -r "{.build_name}-{.version}.zip" *.js plugins/*.js'
    ],
}

builds = {
    'release': {
        'url_dist_base': 'https://iitc.app/build/release',
        'gradle_buildtype': 'release',
        'gradle_distributiontypes': ['apk', 'aab']
    },

    'beta': {
        'url_dist_base': 'https://iitc.app/build/beta',
        'gradle_buildtype': 'beta',
        'gradle_distributiontypes': ['apk', 'aab'],
        'version_timestamp': True,
    },

    'test': {
        'url_dist_base': 'https://iitc.app/build/artifact/PR'+os.getenv('PR_NUMBER', '0'),
        'version_timestamp': True,
    },

    'check': {
        'version_timestamp': True,
        'post_build': ['build_mobile.py'],
    },
}
