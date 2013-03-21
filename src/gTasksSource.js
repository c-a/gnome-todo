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
const Signals = imports.signals;

const Config = imports.config;
const Source = imports.source;
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
            let listObjects = [];
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
                        listObjects.push(listObject);

                        if (--outstandingRequests == 0)
                            this._listTaskListsCallback(null, listObjects);
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
            this._patchTaskListCallback(null, listObject);
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

const GTasksSyncer = new Lang.Class({
    Name: 'GTasksSyncer',

    _init: function(source, service) {
        this._source = source;

        this._service = service;

        this._itemAddedID = 0;
        this._itemRemovedID = 0;
    },

    sync: function(callback) {

        if (this._itemAddedID) {
            this._source.disconnect(this._itemAddedID);
            this._itemAddedID = 0;
        }
        if (this._itemRemovedID) {
            this._source.disconnect(this._itemRemovedID);
            this._itemRemovedID = 0;
        }

        // FIXME: We should merge the remote and local tasks instead
        this._source.clear();

        this._source.connect('item-added', Lang.bind(this, this._listAdded));
        this._source.connect('item-removed', Lang.bind(this, this._listRemoved));

        this._service.listTaskLists(Lang.bind(this, function(error, listObjects) {
            if (error) {
                callback(error);
                return;
            }

            let taskLists = [];
            for (let i = 0; i < listObjects.length; i++)
            {
                let listObject = listObjects[i];

                let taskList = this._source._newTaskList();
                taskList.setTaskListObject(listObject);

                taskLists.push(taskList);
            }

            this._source.processNewItems(taskLists);
            callback(null);
        }));
    },

    _listAdded: function(source, list) {
        list.connect('changed', Lang.bind(this, this._listChanged));
        list.connect('item-added', Lang.bind(this, this._taskAdded));
        list.connect('item-removed', Lang.bind(this, this._taskRemoved));

        if (list.gTasksID)
            return;

        this._service.createTaskList(list.title, Lang.bind(this, function(error, listObject) {
            if (error) {
                this.emit('error', error);
                return;
            }

            list.setTaskListObject(listObject);

            list.forEachItem(Lang.bind(this, function(task) {
                this._taskAdded(list, task);
            }));
        }));
    },

    _listRemoved: function(source, list) {
        if (!list.gTasksID)
            return;

        this._source.addDeletedTaskList(list.gTasksID);

        this._service.deleteTaskList(list.gTasksID, Lang.bind(this, function(error) {
            if (error) {
                this.emit('error', error);
                return;
            }
            this._source.removeDeletedTaskList(list.gTasksID);
        }));
    },

    _listChanged: function(list, props) {
        if (!list.gTasksID)
            return;

        let patchTaskList = { title: list.title };
        this._service.patchTaskList(id, patchTaskList,
            Lang.bind(this, function(error, listObject) {
                if (error) {
                    this.emit('error', error);
                    return;
                }

                list.setTaskListObject(listObject);
            }));
    },

    _taskAdded: function(list, task) {
        task.connect('changed', Lang.bind(this, this._taskChanged));

        // Only create the task if the parent list is already created
        // and the task is not already created.
        if (!list.gTasksID || task.gTasksID)
            return;

        this._service.createTask(list.gTasksID,
            task.title,
            task.completedDate ? task.completedDate.toISO8601() : null,
            task.dueDate ? task.dueDate.toISO8601() : null,
            task.note,
            Lang.bind(this, function(error, taskObject) {
                if (error) {
                    this.emit('error', error);
                    return;
                }

                task.setTaskObject(taskObject);
            }));
    },

    _taskRemoved: function(list, task) {
        if (!task.gTasksID)
            return;

        list.addDeletedTask(task.gTasksID);

        this._service.deleteTask(task.gTasksID, Lang.bind(this, function(error) {
            if (error) {
                this.emit('error', error);
                return;
            }
            list.removeDeletedTaskList(task.gTasksID);
        }));
    },

    taskChanged: function(task, props) {
        if (!task.gTasksID)
            return;

        // TODO: Patch the task 
    }
});
Signals.addSignalMethods(GTasksSyncer.prototype)

const GTasksSource = new Lang.Class({
    Name: 'GTasksSource',
    Extends: Source.Source,

    _init: function(object) {
        this.parent(object.account.id);

        this._object = object
        this._authenticated = false;

        let account = object.account;
        this.name = account.provider_name;
        this.icon = Gio.icon_new_for_string(account.provider_icon);
        this.onlineSource = true;

        this._service = new GTasksService(object.oauth2_based);

        this._syncer = new GTasksSyncer(this, this._service);
        this._syncer.connect('error', Lang.bind(this, this._syncerError));

        this._deletedTaskLists = {};
    },

    _sync: function(callback) {
        this._syncer.sync(callback);
    },

    _newTaskList: function(props) {
        return new GTasksList(this, props);
    },

    addDeletedTaskList: function(id) {
        this._deletedTaskLists[id] = true;
    },

    removeDeletedTaskList: function(id) {
        delete this._deletedTaskLists[id];
    },

    _syncerError: function(syncer, error) {
        this.emit('error', error);
    }
});

const GTasksList = new Lang.Class({
    Name: 'GTaskList',
    Extends: Source.TaskList,

    _init: function(source, props) {
        this.parent(source, props);

        this._taskListObject = null;
        this._deletedTasks = {};
    },

    _serialize: function(object) {
        if (this._taskListObject)
            object.gTaskList = this._taskListObject;
    },

    _deserialize: function(object) {
        if (object.gTaskList)
            this.setTaskListObject(object.gTaskList);
    },

    _newTask: function(props) {
        return new GTasksTask(props);
    },

    setTaskListObject: function(taskListObject) {
        this._taskListObject = taskListObject;

        this.title = this._taskListObject.title;

        if (taskListObject.items) {
            let tasks = [];
            for (let i = 0; i < taskListObject.items.length; i++) {
                let task = new GTasksTask();
                task.setTaskObject(taskListObject.items[i]);
                tasks.push(task);
            }
            this.processNewItems(tasks);
        }
    },

    get gTasksID() {
        this._taskListObject ? this._taskListObject.id : null;
    },

    addDeletedTask: function(id) {
        this._deletedTasks[id] = true;
    },

    removeDeletedTask: function(id) {
        delete this._deletedTasks[id];
    },
});

const GTasksTask = new Lang.Class({
    Name: 'GTasksTask',
    Extends: Source.Task,

    _init: function(props) {
        this.parent(props);

        this._taskObject = null;
    },

    _serialize: function(object) {
        if (this._taskObject)
            object.gTask = this._taskObject;
    },

    _deserialize: function(object) {
        if (object.gTask)
            this.setTaskObject(object.gTask);
    },

    setTaskObject: function(taskObject) {
        this._taskObject = taskObject;

        this._title = taskObject.title;

        this._updatedDate = Utils.dateTimeFromISO8601(taskObject.updated);

        this._notes = taskObject.notes;
        this._dueDate = taskObject.due ? Utils.dateTimeFromISO8601(taskObject.due) : null;
        this._completedDate = taskObject.completed ? Utils.dateTimeFromISO8601(taskObject.completed) : null;

        this.emit('changed', ['title', 'updatedDate', 'notes', 'dueDate', 'completedDate']);
    },

    get gTasksID() {
        this._taskObject ? this._taskObject.id : null;
    }
});
