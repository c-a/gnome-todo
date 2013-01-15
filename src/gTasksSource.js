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

                        listObject.items = tasksObject.items;
                        lists.push(listObject);

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
            this._createTaskListCallback(null, listObject);
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
    },

    createTask: function(listID, title, completed, due, notes, callback) {
        this._authenticate(
            Lang.bind(this, function(error) {
                if (error) {
                    callback(error);
                    return;
                }

                let newTask = { 'title': title };
                newTask.status = completed ? 'completed' : 'needsAction';
                if (due)
                    newTask.due = due.toISO8601();
                if (notes)
                    newTask.notes = notes;
                
                let body = JSON.stringify(newTask);

                this._createTaskCallback = callback;
                this._service.call_function('POST', 'lists/' + listID + '/tasks',
                    body, null, Lang.bind(this, this._createTaskCallCb));
            }));
    },

    _createTaskCallCb: function(service, res) {
        try {
            let response = service.call_function_finish(res);

            let taskObject = JSON.parse(response.toArray());
            this._createTaskCallback(null, taskObject);
        } catch (err) {
            this._createTaskCallback(err);
        }
    },

    deleteTask: function(listID, taskID, callback) {
        this._authenticate(Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            let path = 'lists/' + listID + '/tasks/' + taskID;
            this._deleteTaskCallback = callback;
            this._service.call_function('DELETE', path, null, null,
                Lang.bind(this, this._deleteTaskCallCb));
        }));
    },

    _deleteTaskCallCb: function(service, res) {
        try {
            service.call_function_finish(res);
            this._deleteTaskCallback(null);
        } catch (err) {
            this._deleteTaskCallback(err);
        }
    },
});

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

            let taskLists = [];
            for (let i = 0; i < lists.length; i++)
            {
                let list = lists[i];

                let taskList = new GTasksList(list.id, list.title, this);

                if (list.items) {
                    let tasks = [];
                    for (let i = 0; i < list.items.length; i++)
                        tasks.push(new GTasksTask(list.items[i]));
                    taskList.processNewItems(tasks);
                }

                taskLists.push(taskList);
            }

            this.processNewItems(taskLists);
            callback(null);
        }));
    },

    createTaskList: function(title, callback) {

        // Add a temporary item
        let localID = this._createLocalId();
        let tempList = new GTasksList(localID, title, this);
        this.addItem(tempList);

        this._service.createTaskList(title, Lang.bind(this, function(error, listObject) {
            if (error) {
                this.removeItemById(tempList.id);
                callback(error);
                return;
            }

            let newLtem = new GTasksList(listObject.id, listObject.title, this);
            this.replaceItem(tempList, newList);
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

const GTasksList = new Lang.Class({
    Name: 'GTasksList',
    Extends: Utils.BaseManager,

    _init: function(id, title, source) {
        this.parent();

        this.id = id;
        this.title = title;

        this._source = source;
        this.sourceID = source.id;
        this._service = source._service;

        this._createOperationSerial = 0;
    },

    deleteTask: function(id, callback) {
        this._service.deleteTask(this.id, id, Lang.bind(this, function(error) {
            if (error) {
                callback(error);
                return;
            }

            this.removeItemById(id);
            this._source.emit('item-updated', this);
            callback(null);
        }));
    },

    createTask: function(title, completed, due, note, callback) {
        this._service.createTask(this.id, title, completed, due, note,
            Lang.bind(this, function(error, taskObject) {
                if (error) {
                    callback(error);
                    return;
                }

                let task = new GTasksTask(taskObject);
                task._createOperationSerial = this._createOperationSerial;
                this.addItem(task);
                callback(null, task);
            }));

        return this._createOperationSerial++;
    }
});

const GTasksTask = new Lang.Class({
    Name: 'GTasksTask',

    _init: function(taskObject) {
        this.id = taskObject.id;
        this.etag = taskObject.etag;
        this.title = taskObject.title;

        this.updatedDate = Utils.dateTimeFromISO8601(taskObject.updated);

        if (taskObject.parent)
            this.parentID = taskObject.parent;

        this.position = taskObject.position;
        this.notes = taskObject.notes;
        this.completed = taskObject.status == 'completed';

        this.dueDate = taskObject.due ? Utils.dateTimeFromISO8601(taskObject.due) : null;
        this.completedDate = taskObject.completed ? Utils.dateTimeFromISO8601(taskObject.completed) : null;

        this.links = taskObject.links;
    }
});
