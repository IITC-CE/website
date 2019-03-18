Example of generating all pages for which there is a template in the `template` folder:

```python3 update.py --template=template --static=/var/www/ --config=config.json --page=all```

Crontab for hourly news updates on the home page:

```0 * * * * cd /home/modos189/IITC-CE/website/ && python3 update.py --template=template --static=/var/www/ --config=config.json --page=index > update_index.log```
