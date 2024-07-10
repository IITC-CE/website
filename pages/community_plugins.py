#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
import requests
import json
import logging
from typing import List, Dict
from operator import itemgetter

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_community_plugins() -> List[Dict]:
    default_meta_url = "https://github.com/IITC-CE/Community-plugins/raw/master/dist/meta.json"
    meta_url = os.getenv("COMMUNITY_PLUGINS_META_URL", default_meta_url)

    try:
        response = requests.get(meta_url)
        response.raise_for_status()

        data = json.loads(response.text)
        if 'plugins' in data:
            return data['plugins']
        else:
            logger.error("Key 'plugins' not found in the JSON data.")
            return []
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching data from {meta_url}: {e}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing JSON data: {e}")
        return []


def sort_plugins_by_name(plugins: List[Dict]) -> List[Dict]:
    return sorted(plugins, key=itemgetter('name'))


def get_community_plugins_by_categories() -> Dict[str, Dict]:
    plugins = get_community_plugins()

    categorized = {}
    for plugin in plugins:
        category = plugin.get('category')
        if category not in categorized:
            categorized[category] = {
                "name": category,
                "plugins": []
            }
        categorized[category]["plugins"].append(plugin)

    # Sort plugins within each category by 'name'
    for category in categorized.values():
        category["plugins"] = sort_plugins_by_name(category["plugins"])

    # Sort categories alphabetically by category name
    sorted_categories = dict(sorted(categorized.items()))

    return {"categories": sorted_categories}
