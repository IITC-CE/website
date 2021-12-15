Example of generating all pages for which there is a template in the `template` folder:

```python3 update.py --template=template --static=/var/www/ --config=config.json --page=all```

Crontab for hourly news updates on the home page:

```0 * * * * cd /path/to/repo/ && python3 update.py --template=template --static=static --config=config.json --page=index > update.log```

# Install and start in virtual environment

## Installing prerequisites

Installing prerequisites on Ubuntu or Debian:

`sudo apt install build-essential python3-dev python3-pip python3-venv`

## Creating / Initiating a virtual environment

A virtual environment is created in project folder using a command:

`python3 -m venv venv`

Activation:

`source venv/bin/activate`

If this is the first start of the virtual environment, run the command:

`pip install -r requirements.txt`

***Remember**: When you are done working with one environment, before switching to another - or working with the globally installed one - you need to make sure to **deactivate** it.*

## Start

Next, launch as usual:

`python update.py`