#!/usr/bin/env python3

__copyright__ = 'Copyright (c) 2021, Utrecht University'
__license__ = 'GPLv3, see LICENSE'

from flask import Blueprint, render_template

import api

deposit_bp = Blueprint('deposit_bp', __name__,
                       template_folder='templates',
                       static_folder='static/deposit',
                       static_url_path='/assets')

"""
    1. Upload data:     /deposit/
    2. Add metadata:    /deposit/metadata/
    3. Submit:          /deposit/submit/
    4. Thankyou page    /deposit/thankyou/
"""


def get_deposit_path():
    """ Returns folder to deposit files. default: '/research-initial' """
    response = api.call('deposit_path')
    path = "/" + response['data']['deposit_path']
    return path.replace('//', '/')


@deposit_bp.route('/', strict_slashes=False)
@deposit_bp.route('/browse')
def index():
    """ Step 1: Deposit files and folders """

    items = 25
    # path = request.args.get('dir')
    path = get_deposit_path()

    return render_template('deposit/deposit.html',
                           activeModule='deposit',
                           searchHtml='',
                           items=items,
                           dir=path)


@deposit_bp.route('/metadata/', strict_slashes=False)
def form():
    """Step 2: Add metadata to your upload"""
    path = get_deposit_path()
    return render_template('deposit/metadata-form.html', path=path)


@deposit_bp.route('/submit/', strict_slashes=False)
def submit():
    """Step 3: Submit upload"""
    path = get_deposit_path()
    return render_template('deposit/submit.html', path=path)


@deposit_bp.route('/thankyou/', strict_slashes=False)
def thankyou():
    """Step 4: Thank you page """
    path = get_deposit_path()
    return render_template('deposit/thankyou.html', path=path)