/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
 *
 * Gnome To Do is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by the
 * Free Software Foundation; either version 2 of the License, or (at your
 * option) any later version.
 *
 * Gnome To Do is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of MERCHANTABILITY
 * or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License
 * for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with Gnome To Do; if not, write to the Free Software Foundation,
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
        let listsObject;
        try {
            let body = service.call_function_finish(res);
            listsObject = JSON.parse(body.toArray());
        }
        catch (err) {
            this._listTaskListsCallback(err);
            return;
        }
        
        let outstandingRequests = listsObject.items.length;
        for (let i = 0; i < listsObject.items.length; i++) {
            let listObject = listsObject.items[i];

            this._service.call_function('GET', 'lists/' + listObject.id + '/tasks',
                null, null, Lang.bind(this, function(service, res) {

                    let tasksObject;
                    try {
                        let tasksbody = service.call_function_finish(res);
                        tasksObject = JSON.parse(tasksbody.toArray());
                    } catch (err) {
                        this._listTaskListsCallback(err);
                    }

                    listObject.tasks = tasksObject.tasks;
                    this._listTaskListsCallback(null, listObject);

                    // This was the last TaskList
                    if (--outstandingRequests == 0)
                        this._listTaskListsCallback(null, null);
                }));
        }
    },

    createTaskList: function(title, callback) {
        this._authenticate(Lang.bind(this, function(error) {
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
        let listObject;
        try {
            let response = service.call_function_finish(res);
            listObject = JSON.parse(response.toArray());
        } catch (err) {
            this._createTaskListCallback(err);
            return;
        }

        this._createTaskListCallback(null, listObject);
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
        } catch (err) {
            this._deleteTaskListCallback(err);
        }

        this._deleteTaskListCallback(null);
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
        let listObject;
        try {
            let response = service.call_function_finish(res);
            listObject = JSON.parse(response.toArray());
        } catch (err) {
            this._patchTaskListCallback(err);
            return;
        }

        this._patchTaskListCallback(null, listObject);
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
        let taskObject;
        try {
            let response = service.call_function_finish(res);
            taskObject = JSON.parse(response.toArray());
        } catch (err) {
            this._createTaskCallback(err);
            return;
        }

        this._createTaskCallback(null, taskObject);
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
        } catch (err) {
            this._deleteTaskCallback(err);
            return;
        }

        this._deleteTaskCallback(null);
    },
});

const GTasksSyncer = new Lang.Class({
    Name: 'GTasksSyncer',

    _init: function(source, service) {
        this._source = source;

        this._service = service;

        this._source.connect('item-added', Lang.bind(this, this._listAdded));
        this._source.connect('item-removed', Lang.bind(this, this._listRemoved));
    },

    sync: function(callback) {

        this._service.listTaskLists(Lang.bind(this, function(error, listObject) {
            if (error) {
                callback(error);
                return;
            }

            // Received all TaskLists
            if (!listObject) {
                callback(null);
                return;
            }

            // Check if the task list was removed locally
            if (this._source.taskListIsDeleted(listObject.id))
                return;

            // Check if we already have a TaskList with this id
            let taskList = this._source.findTaskList(listObject.id);
            if (taskList) {
                taskList.setTaskListObject(listObject);
            }
            else {
                 // Create a new TaskList and add it
                taskList = this._source._newTaskList();
                taskList.setTaskListObject(listObject);
                this._source.addItem(taskList);
            }
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
        this._service.patchTaskList(list.gTasksID, patchTaskList,
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

        this._service.deleteTask(list.gTasksID, task.gTasksID, Lang.bind(this, function(error) {
            if (error) {
                this.emit('error', error);
                return;
            }
            list.removeDeletedTask(task.gTasksID);
        }));
    },

    _taskChanged: function(task, props) {
        if (!task.gTasksID)
            return;

        this._patchTask(task);
    },

    _patchTask: function(task) {

        let patchObject = task.getPatchObject();
    }
});
Signals.addSignalMethods(GTasksSyncer.prototype)

const GTasksSource = new Lang.Class({
    Name: 'GTasksSource',
    Extends: Source.Source,

    _init: function(object) {
        this.parent('gtasks-' + object.account.id);

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

    _serialize: function(object) {
        let gTasks = {};

        if (this._deletedTaskLists.length > 0)
            gTasks.deletedTaskLists = this._deletedTaskLists;

        if (Object.keys(gTasks).length > 0)
            object._gTasks = gTasks;
    },

    _deserialize: function(object) {
        if (!object._gTasks)
            return;

        if (object._gTasks.deletedTaskLists)
            this._deletedTaskLists = object._gTasks.deletedTaskLists;
    },

    _newTaskList: function(props) {
        return new GTasksList(this, props);
    },

    addDeletedTaskList: function(gTasksID) {
        this._deletedTaskLists[gTasksID] = true;
    },

    removeDeletedTaskList: function(gTasksID) {
        delete this._deletedTaskLists[gTasksID];
    },

    taskListIsDeleted: function(gTasksID) {
        return this._deletedTaskLists.hasOwnProperty(gTasksID);
    },

    findTaskList: function(gTasksID) {
        let found = null;
        this.forEachItem(Lang.bind(this, function(taskList) {
            if (taskList.gTasksID === gTasksID)
                found = taskList;
        }));

        return found;
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
        let gTasks = {};

        if (this._taskListObject)
            gTasks.taskList = this._taskListObject;

        if (Object.keys(gTasks).length > 0)
            object._gTasks = gTasks;
    },

    _deserialize: function(object) {
        if (!object._gTasks)
            return;

        if (object._gTasks.taskList)
            this.setTaskListObject(object._gTasks.taskList);
    },

    _newTask: function(props) {
        return new GTasksTask(props);
    },

    setTaskListObject: function(taskListObject) {
        this._taskListObject = taskListObject;

        this.title = this._taskListObject.title;

        if (taskListObject.items) {
            let tasks = [];
            for (let i = 0; i < taskListObject.tasks.length; i++) {
                let task = new GTasksTask();
                task.setTaskObject(taskListObject.tasks[i]);
                tasks.push(task);
            }
            this.processNewItems(tasks);
        }
    },

    get gTasksID() {
        return this._taskListObject ? this._taskListObject.id : null;
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
        let gTasks = {};

        if (this._taskObject)
            gTasks.task = this._taskObject;

        if (Object.keys(gTasks).length > 0)
            object._gTasks = gTasks;
    },

    _deserialize: function(object) {
        if (!object._gTasks)
            return;

        if (object._gTasks.task)
            this.setTaskObject(object._gTasks.task);
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
        return this._taskObject ? this._taskObject.id : null;
    },

    getPatchObject: function() {
        let patchObject = {};

        if (this._title !== this._taskObject.title)
            patchObject.title = this._title;

        if (this._notes !== this._taskObject.notes)
            patchObject.note = this._note;

        if (!GdPrivate.date_time_equal(this._dueDate,
            Utils.dateTimeFromISO8601(this._taskObject.updated)))
            patchObject.dueDate = this._dueDate ? this._dueDate.toISO8601() : null;

        if (!GdPrivate.date_time_equal(this._completedDate,
            Utils.dateTimeFromISO8601(this._taskObject.completed)))
            patchObject.completedDate = this._completedDate ? this._completedDate.toISO8601() : null;
    }
});
