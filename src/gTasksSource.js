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
const Utils = imports.utils;

const _ = imports.gettext.gettext;


const GTasksSource = new Lang.Class({
    Name: 'GTasksSource',
    Extends: Utils.BaseManager,

    _init: function(object) {
        this.parent();

        this._object = object
        this._authenticated = false;

        let account = object.account;
        this.id = account.id;
        this.name = account.provider_name;
        this.icon = Gio.icon_new_for_string(account.provider_icon);
        this.onlineSource = true;

        this._service = new GTasksService(object.oauth2_based);
    },

    refresh: function(callback) {
        this._service.listTaskLists(Lang.bind(this, function(error, lists) {
            if (error) {
                callback(error);
                return;
            }

            for (let i = 0; i < lists.length; i++)
                lists[i].sourceID = this.id;

            this.processNewItems(lists);
            callback(null);
        }));
    },

    createTaskList: function(title, callback) {

        // Add a temporary item
        let localID = this._createLocalId();
        let tempList = new GTasksList(localID, title);
        tempList.sourceID = this.id;
        this.addItem(tempList);

        this._service.createTaskList(title, Lang.bind(this, function(error, list) {
            this.removeItemById(tempList.id);

            if (error) {
                callback(error);
                return;
            }

            list.sourceID = this.id;
            this.addItem(list);
            callback(null);
        }));
    },

    deleteTaskList: function(id, callback) {
        /* We remove the TaskList locally before it's actually removed from
         * the server, and add it back if the removal was unsuccesful. */
        let taskList = this.getItemById(id);
        this.removeItemById(id);

        this._service.deleteTaskList(id, Lang.bind(this, function(error) {
            if (error) {
                // Add back the TaskList
                this.addItem(taskList);
                callback(error);
                return;
            }
            
            callback(null);
        }));
    },

    renameTaskList: function(id, title, callback) {
        /* We rename the TaskList locally before it's actually renamed on
         * the server, and change it back if the rename was unsuccesful. */
        let taskList = this.getItemById(id);
        let newTaskList = taskList;
        newTaskList.title = title;
        this.addItem(newTaskList);

        let patchTaskList = { title: title };
        this._service.patchTaskList(id, patchTaskList,
            Lang.bind(this, function(patchedTaskList, error) {
                if (error) {
                    callback(error);
                    return;
                }

                callback(null);
            }));
    },

    _createLocalId: function() {
        let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        let localID;
        while(true) {
            let randomCharacters = [];
            for(let i = 0; i < 43; i++)
                randomCharacters.push(possible.charAt(Math.floor(Math.random() * possible.length)));

            localID = 'local-' + this.id + '-' + randomCharacters.join('');
            if (!this.getItemById(localID))
                return localID;
        }
    }
});

const GTasksService = new Lang.Class({
    Name: 'GTasksService',

    _init: function(oauth2Based) {
        this._oauth2Based = oauth2Based;

        this._service = new GdPrivate.GTasksService(
            { client_id: oauth2Based.client_id });
    },

     _authenticate: function(callback) {

        if (this._authenticated) {
            callback(null);
            return;
        }

        let oauth2Based = this._oauth2Based;
        oauth2Based.call_get_access_token(null,
            Lang.bind(this, function(object, result) {
                try {
                    let [res, access_token, expires_in] = oauth2Based.call_get_access_token_finish(result);

                    this._service.access_token = access_token;
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
                this._service.call_function('GET',
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
                this._service.call_function('GET',
                    'lists/' + listObject.id + '/tasks', null, null,
                    Lang.bind(this, function(service, res) {

                        let listbody = service.call_function_finish(res);
                        let tasksObject = JSON.parse(listbody.toArray());

                        let list = new GTasksList(listObject.id, listObject.title);
                        if (tasksObject.items)
                            list.processNewItems(tasksObject.items);
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
                this._service.call_function('POST', 'users/@me/lists',
                    body, null, Lang.bind(this, this._createListCallCb));
            }));
    },

    _createListCallCb: function(service, res) {
        try {
            let response = service.call_function_finish(res);

            let listObject = JSON.parse(response.toArray());
            this._createTaskListCallback(null,
                new GTasksList(listObject.id, listObject.title));
        } catch (err) {
            this._createTaskListCallback(err);
        }
    },

    deleteTaskList: function(id, callback) {
        this._authenticate(Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            this._deleteTaskListCallback = callback;
            this._service.call_function('DELETE',
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

    patchTaskList: function(id, patchTaskList, callback) {
        this._authenticate(Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            let body = JSON.stringify(patchTaskList);

            this._patchTaskListCallback = callback;
            this._service.call_function('PATCH',
                'users/@me/lists/' + id, body, null,
                Lang.bind(this, this._patchListCallCb));
        }));
    },

    _patchListCallCb: function(service, res) {
        try {
            let response = service.call_function_finish(res);

            let listObject = JSON.parse(response.toArray());
            this._patchTaskListCallback(null,
                this.createList(listObject.id, listObject.title));
        } catch (err) {
            this._patchTaskListCallback(err);
        }
    }
});

const GTasksList = new Lang.Class({
    Name: 'GTasksList',
    Extends: Utils.BaseManager,

    _init: function(id, title) {
        this.parent();

        this.id = id;
        this.title = title;
    }
});
