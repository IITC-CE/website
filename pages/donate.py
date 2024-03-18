#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# SPDX-License-Identifier: AGPL-3.0-or-later

import re
from datetime import datetime, date
from pages.__utils__ import fetch_json_from_url


def get_issue_text(username: str, repo: str, issue_number: int):
    url = f"https://api.github.com/repos/{username}/{repo}/issues/{issue_number}"
    json = fetch_json_from_url(url)
    if json is not None:
        return json.get('body', 'No text available')
    else:
        return None


def parse_donations_data(data):
    # Split the data by the year sections
    year_sections = re.split(r'[\r\n]+\s*---\s*[\r\n]+', data)

    # Initialize the result dictionary
    result = {}

    for section in year_sections:
        lines = section.strip().split('\n')
        year_line, annual_costs_line, monthly_costs_line = lines[:3]

        # Extract the year
        year = re.findall(r'\d{4}', year_line)[0]

        # Extract costs
        annual_costs = re.findall(r'\$([0-9]+)', annual_costs_line)[0]
        monthly_costs = re.findall(r'\$([0-9]+)', monthly_costs_line)[0]

        # Initialize donations list
        donations = []

        # Parse donations
        for line in lines[6:]:  # Skip headers
            try:
                date, euro, dollar = re.split(r' \| ', line+" ")
                euro = euro.strip() if euro.strip() else None
                dollar = dollar.strip() if dollar.strip() else None
                donations.append({'date': date, 'euro': euro, 'dollar': dollar})
            except ValueError:
                continue

        # Add to result
        result[year] = {
            'annual_costs': annual_costs,
            'monthly_costs': monthly_costs,
            'donations': donations
        }

    return result


def calculate_net_income(parsed_data, start_date="01.06.2022", euro_to_dollar_rate=1.1):
    """
    Calculate the net income or loss since a given start date.

    Args:
    - parsed_data: The data structure containing donations and costs.
    - start_date: The start date for the calculation in DD.MM.YYYY format.
    - euro_to_dollar_rate: The conversion rate from euros to dollars.

    Returns:
    - Net income or loss as a float.
    """
    start_date_obj = datetime.strptime(start_date, "%d.%m.%Y")
    current_date = datetime.now()

    total_donations = 0
    total_expenses = 0
    for year, details in parsed_data.items():
        annual_costs = int(details["annual_costs"])
        monthly_costs = int(details["monthly_costs"])
        donations = details["donations"]

        # Calculate donations for each year
        for donation in donations:
            donation_date = datetime.strptime(donation["date"], "%Y.%m.%d")
            if start_date_obj <= donation_date <= current_date:
                euro = donation["euro"].replace(',', '.') if donation["euro"] else 0
                dollar = donation["dollar"].replace(',', '.') if donation["dollar"] else 0
                total_donations += float(euro) * euro_to_dollar_rate + float(dollar)

        # Calculate expenses since the start date
        if start_date_obj.year <= int(year) <= current_date.year:
            months_of_expenses = 12  # Default to 12 months for each year
            if int(year) == start_date_obj.year:
                months_of_expenses -= start_date_obj.month - 1  # Adjust for start month
            if int(year) == current_date.year:
                months_of_expenses = current_date.month  # Adjust for the current year

            total_expenses += annual_costs + (monthly_costs * months_of_expenses)

    net_income = round(total_donations - total_expenses, 2)
    return net_income


def get_donations_data():
    username = "IITC-CE"
    repo = "website"
    issue_number = 47

    text = get_issue_text(username, repo, issue_number)
    if text is None:
        return {}
    donations_data = parse_donations_data(text)
    net_income = calculate_net_income(donations_data)

    last_period = list(donations_data.values())[-1]
    return {
        "donations_data": donations_data,
        "annual_costs": last_period['annual_costs'],
        "monthly_costs": last_period['monthly_costs'],
        "current_year_month": date.today().strftime("%Y.%m"),
        "net_income": net_income
    }


