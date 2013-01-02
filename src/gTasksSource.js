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

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Signals = imports.signals;

const Config = imports.config;
const Global = imports.global;

const _ = imports.gettext.gettext;


const GTasksSource = new Lang.Class({
    Name: 'GTasksSource',

    _init: function(object) {
        this._object = object

        this._authenticated = false;

        let account = object.account;
        this.id = account.id;
        this.name = account.provider_name;
        this.icon = Gio.icon_new_for_string(account.provider_icon);
        this.onlineSource = true;

        let oauth2Based = object.oauth2_based;

        this._gTasksService = new GdPrivate.GTasksService(
            { client_id: oauth2Based.client_id });
    },

    _authenticate: function(callback) {

        if (this._authenticated) {
            callback(null);
            return;
        }

        let oauth2Based = this._object.oauth2_based;
        oauth2Based.call_get_access_token(null,
            Lang.bind(this, function(object, result) {
                try {
                    let [res, access_token, expires_in] = oauth2Based.call_get_access_token_finish(result);

                    this._gTasksService.access_token = access_token;
                    this._authenticated = true;
                    callback(null);
                } catch (err) {
                    callback(err);
                }
            }));
    },

    listTaskLists: function(callback) {
        this._authenticate(
            Lang.bind(this, function(error) {
                if (error)
                    callback(error);

                this._listTaskListsCallback = callback;
                this._gTasksService.call_function('GET',
                    'users/@me/lists', null,
                    null, Lang.bind(this, this._getListsCallCb));
            }));
    },

    _getListsCallCb: function(service, res) {
        try {
            let body = service.call_function_finish(res);

            let response = JSON.parse(body.toArray());
            let lists = [];
            let outstandingRequests = 0;
            for (let i = 0; i < response.items.length; ++i) {
                let listObject = response.items[i];

                outstandingRequests++;
                this._gTasksService.call_function('GET',
                    'lists/' + listObject.id + '/tasks', null, null,
                    Lang.bind(this, function(service, res) {

                        let listbody = service.call_function_finish(res);
                        let listresponse = JSON.parse(listbody.toArray());

                        let list = this._createList(listObject);
                        if (listresponse.items)
                            list.items = listresponse.items;
                        lists.push(list);

                        if (--outstandingRequests == 0)
                            this._listTaskListsCallback(null, lists);
                    }));
            }
        } catch (err) {
            this._listTaskListsCallback(err);
        }
    },

    createTaskList: function(title, callback) {
        this._authenticate(
            Lang.bind(this, function(error) {
                if (error) {
                    callback(error);
                    return;
                }

                let newTaskList = { 'title': title };
                let body = JSON.stringify(newTaskList);

                this._createTaskListCallback = callback;
                this._gTasksService.call_function('POST', 'users/@me/lists',
                    body, null, Lang.bind(this, this._createListCallCb));
            }));
    },

    _createListCallCb: function(service, res) {
        try {
            let response = service.call_function_finish(res);

            let listObject = JSON.parse(response.toArray());
            this._createTaskListCallback(null, this._createList(listObject));
        } catch (err) {
            this._createTaskListCallback(err);
        }
    },

    _createList: function(listObject) {
        let list = { id: listObject.id, title: listObject.title, items: [],
            sourceID: this.id };
        return list;
    },

    deleteTaskList: function(id, callback) {
        this._authenticate(Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            this._deleteTaskListCallback = callback;
            this._gTasksService.call_function('DELETE',
                'users/@me/lists/' + id, null, null,
                Lang.bind(this, this._deleteListCallCb));
        }));
    },

    _deleteListCallCb: function(service, res) {
        try {
            service.call_function_finish(res);
            this._deleteTaskListCallback(null);
        } catch (err) {
            this._deleteTaskListCallback(err);
        }
    },

    renameTaskList: function(id, title, callback) {
        this._authenticate(Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            let updatedTaskList = { 'title': title };
            let body = JSON.stringify(updatedTaskList);

            this._renameTaskListCallback = callback;
            this._gTasksService.call_function('PATCH',
                'users/@me/lists/' + id, body, null,
                Lang.bind(this, this._updateListCallCb));
        }));
    },

    _updateListCallCb: function(service, res) {
        try {
            let response = service.call_function_finish(res);

            let listObject = JSON.parse(response.toArray());
            this._renameTaskListCallback(null, this._createList(listObject));
        } catch (err) {
            this._renameTaskListCallback(err);
        }
    }
});
