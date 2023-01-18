#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
import urllib.request
import urllib.parse
from bs4 import BeautifulSoup


def get_telegram_widget(channel):
    url = f"https://t.me/s/{channel}"
    response = urllib.request.urlopen(url, timeout=10)
    soup = BeautifulSoup(response.read(), 'html5lib')

    posts = soup.find('section', class_='tgme_channel_history').findChildren('div', recursive=False)
    last_post = posts[-1]
    message = last_post.find('div', class_='tgme_widget_message_text')
    return message


def get_screenshots_carousel():
    screenshots = []
    for file in os.listdir('./static/img/screenshots/'):
        if not file.endswith('.html'):
            screenshots.append("img/screenshots/"+file)
    return screenshots
