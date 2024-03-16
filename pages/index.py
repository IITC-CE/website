#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import os
from bs4 import BeautifulSoup
from pages.__utils__ import load_page_with_retries


def get_telegram_widget(channel):
    url = f"https://t.me/s/{channel}"
    response = load_page_with_retries(url)
    if response is None:
        return None

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
