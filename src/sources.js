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
const GLib = imports.gi.GLib;
const Goa = imports.gi.Goa;

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

        let account = object.get_account();
        this.id = account.get_id();
        this.name = account.provider_name;
        this.icon = Gio.icon_new_for_string(account.provider_icon);

        let oauthBased = object.get_oauth_based();
 
        this._gTasksService = new Gd.GTasksService(
            { consumer_key: oauthBased.get_consumer_key(),
              consumer_secret: oauthBased.get_consumer_secret() });
    },

    _authenticate: function(callback) {
        let oauthBased = this.object.get_oauth_based();

        ouathBased.call_get_access_token(null, function(object, res) {
            try {
                let ret = oauthBased.call_get_access_token_finish(res);

                this._gTasksService.token = ret[1];
                this._gTasksService.token_secret = ret[2];
                
            } catch (e) {
                /* TODO: Real notification */
                let notification = new Gtk.Label({ label: 'Failure' });
                Global.notificationManager.addNotification(notification);
            }
        });
    },

    listTaskLists: function(callback) {
    }
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

            let source = new Source(object);
            this.sources[source.id] = source;
            this.emit('source-added', source);
        }

        this._goaClient.connect('account-added',
            Lang.bind(this, this._accountAddedCb));
        this._goaClient.connect('account-removed',
            Lang.bind(this, this._accountRemovedCb));

        /*XXX: Add mock source */
        let mockSource = new MockSource();
        this.sources[mockSource.id] = mockSource;
        this.emit('source-added', mockSource);
    },

    _validObject: function(object) {
        let account = object.get_account();
        return ((object.tasks != null) &&
                (account.provider_type == 'google') &&
                (object.oauth_based != null));          
    },

    _accountAddedCb: function(goaClient, object) {
        if (!this._validAccount(account))
            return;

        let source = new Source(object);
        this.sources[source.id] = source;
        this.emit('source-added', source);
    },

    _accountRemovedCb: function(goaClient, object) {

        let account = object.get_account();
        if (!account)
            return;

        if (this.accounts.hasOwnProperty(account.get_id)) {
            let source = this.accounts[account.id];
            this.sources[account.id] = undefined; 
            this.emit('source-removed', source);
        }
    }
}
Signals.addSignalMethods(SourceManager.prototype);

