/*
 * Copyright (c) 2012 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome Documents is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome Documents is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome Documents; if not, write to the Free Software Foundation,
 * Inc., 51 Franklin St, Fifth Floor, Boston, MA  02110-1301  USA
 *
 * Author: Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 */

const Gio = imports.gi.Gio;
const Goa = imports.gi.Goa;

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const GTasksSource = imports.gTasksSource;
const Utils = imports.utils;

const _ = imports.gettext.gettext;

const SourceManager = new Lang.Class({
    Name: 'SourceManager',
    Extends: Utils.BaseManager,

    _init: function() {
        this.parent();

        // Connect to goa
        try {
            this._goaClient = Goa.Client.new_sync(null);
        } catch (e) {
            throw('Unable to create the GOA client: ' + e.toString());
        }

        this._defaultSource = null;

        let accounts = this._goaClient.get_accounts();
        for (let i = 0; i < accounts.length; i++)
        {
            let object = accounts[i];
            if (!this._validObject(object))
                continue;

            this._addGTasksSource(object);
        }

        this._goaClient.connect('account-added',
            Lang.bind(this, this._accountAddedCb));
        this._goaClient.connect('account-removed',
            Lang.bind(this, this._accountRemovedCb));
        this._goaClient.connect('account-changed',
            Lang.bind(this, this._accountChangedCb));
    },

    getDefaultSource: function() {
        return this._defaultSource;
    },

    setDefaultSource: function(source) {
        this._defaultSource = source;
    },

    _addGTasksSource: function(object) {
        let source = new GTasksSource.GTasksSource(object);
        this.addItem(source);

        if (!this._defaultSource)
            this._defaultSource = source;
    },

    _validObject: function(object) {
        let account = object.get_account();

        return ((object.tasks != null) &&
                (account.provider_type == 'google') &&
                (object.oauth2_based != null));
    },

    _accountAddedCb: function(goaClient, object) {
        if (!this._validObject(object))
            return;

        this._addGTasksSource(object);
    },

    _accountRemovedCb: function(goaClient, object) {

        let account = object.account;
        if (!account)
            return;

        this.removeItemById(account.id);
    },

    _accountChangedCb: function(goaClient, object) {

        let account = object.account;
        if (!account)
            return;

        if (this.sources.hasOwnProperty(account.id)) {
            if (!this._validObject(object))
                this.removeItemById(account.id);
        }
        else {
            if (this._validObject(object))
                this._addGTasksSource(object);
        }
    }
});
