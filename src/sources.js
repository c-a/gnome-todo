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

const GdPrivate = imports.gi.GdPrivate;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

const Config = imports.config;
const Global = imports.global;

const _ = imports.gettext.gettext;

function MockSource()
{
  this._init();
}

MockSource.prototype = {
  _init: function()
  {
    this.id = 'mock##';
    this.name ='MockSource';
    this.icon = Gio.icon_new_for_string('system');
  },

  listTaskLists: function(callback) {
    let lists = [];

    lists.push({ name: 'Test List 1',
                 items: ['Item 1', 'Item 2'] });

    lists.push({ name: 'Test List 2',
                 items: ['Item 3', 'Item 4'] });

    callback(null, lists);
  }
}

function GTasksSource(object)
{
    this._init(object);
}

GTasksSource.prototype = {
    _init: function(object) {
        this._object = object

        this._authenticated = false;

        let account = object.account;
        this.id = account.id;
        this.name = account.provider_name;
        this.icon = Gio.icon_new_for_string(account.provider_icon);

        let oauth2Based = object.oauth2_based;

        this._gTasksService = new GdPrivate.GTasksService(
            { client_id: oauth2Based.client_id });
    },

    _authenticate: function(callback) {

        if (this._authenticated)
            callback(this._authenticated);

        let oauth2Based = this._object.oauth2_based;
        oauth2Based.call_get_access_token(null,
            Lang.bind(this, function(object, res) {
                try {
                    let [access_token, expires_in] = oauth2Based.call_get_access_token_finish(res);

                    this._gTasksService.token = access_token;
                    this._authenticated = true;
                } catch (e) {
                    /* TODO: Add button for reauthentication. */
                    let notification = new Gtk.Label({ label: e.message });
                    Global.notificationManager.addNotification(notification);
                }

                callback(this._authenticated);
            }));
    },

    listTaskLists: function(callback) {
        this._authenticate(
            Lang.bind(this, function(authenticated) {
                if (!authenticated)
                    return;

                let lists = [];

                lists.push({ name: 'GTask List 1',
                    items: ['Item 1', 'Item 2'] });

                lists.push({ name: 'GTask List 2',
                    items: ['Item 3', 'Item 4'] });

                callback(null, lists);
            }));
    },

}


function SourceManager()
{
    this._init();
}

SourceManager.prototype = {
    _init: function() {
        // Connect to goa
        try {
            this._goaClient = Goa.Client.new_sync(null);
        } catch (e) {
            throw('Unable to create the GOA client: ' + e.toString());
        }

        this.sources = {};

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

        /*XXX: Add mock source */
        let mockSource = new MockSource();
        this.sources[mockSource.id] = mockSource;
        this.emit('source-added', mockSource);
    },

    _addGTasksSource: function(object) {
        let source = new GTasksSource(object);
        this.sources[source.id] = source;
        this.emit('source-added', source);
    },

    _removeGTasksSource: function(object) {
        let source = this.sources[object.account.id];
        delete this.sources[object.account.id];
        this.emit('source-removed', source);
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

        if (this.sources.hasOwnProperty(account.id))
            this._removeGTasksSource(object);
    },

    _accountChangedCb: function(goaClient, object) {

        let account = object.account;
        if (!account)
            return;

        if (this.sources.hasOwnProperty(account.id)) {
            if (!this._validObject(object))
                this._removeGTasksSource(object);
        }
        else {
            if (this._validObject(object))
                this._addGTasksSource(object);
        }
    }
}
Signals.addSignalMethods(SourceManager.prototype);

