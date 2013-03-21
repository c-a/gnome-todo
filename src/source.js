/*
 * Copyright (c) 2013 Carl-Anton Ingmarsson <carlantoni@gnome.org>
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

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const Utils = imports.utils;

const _ = imports.gettext.gettext;

const Source = new Lang.Class({
    Name: 'Source',
    Extends: Utils.BaseManager,

    _init: function(id) {
        this.parent();

        this.id = id;

        let path = GLib.build_filenamev([GLib.get_user_data_dir(), 'gnome-todo', id]);
        this._file = Gio.File.new_for_path(path);

        this._load();
    },

    sync: function(callback) {
        this._sync(callback);
    },

    createTaskList: function(title) {
        let taskList = this._newTaskList({ title: title });
        this.addItem(taskList);
    },

    deleteTaskList: function(id) {
        this.removeItemById(id);
    },

    addItem: function(item) {
        if (!item.id) {
            while (true) {
                item.id = Utils.generateID('task-list');
                if (!this.getItemById(item.id))
                    break;
            }
        }

        Utils.BaseManager.prototype.addItem.call(this, item);
    },

    _load: function() {
        let res, data;

        try {
            [res, data] = this._file.load_contents(null);
        }
        catch(err) {
            return;
        }

        let object = JSON.parse(data);

        for (let i = 0; i < object.taskLists; i++) {
            let taskList = new TaskList();
            taskList.deserialize(object.taskLists[i]);
            this.addItem(task);
        }

        this._deserialize(object);
    },

    _save: function() {

        let object = {
            kind:      'gnome-todo#source',
            id:        this.id,
            taskLists: []
        };

        this.forEachItem(Lang.bind(this, function(taskList) {
            object.taskLists.push(taskList.serialize());
        }));
        this._serialize();

        let data = JSON.stringify(object);
        try {
            this._file.replace_contents(data, null, true, 0, null);
        }
        catch(err) {
            this.emit('save-error', error);
        }
    },

    // Functions that subclasses should implement

    _sync: function(callback) {
    },

    _serialize: function(object) {
    },

    _deserialize: function(object) {
    },

    _newTaskList: function(props) {
        return new TaskList(this, props);
    }
});

const TaskList = new Lang.Class({
    Name: 'TaskList',
    Extends: Utils.BaseManager,

    _init: function(source, props) {
        this.parent();

        this.source = source;

        if (props) {
            this._title = props.title;
        }
    },

    get title() {
        return this._title;
    },

    set title(title) {
        this._title = title;
        this.emit('changed', 'title');
    },

    serialize: function() {
        let object = { id: this.id, title: this.title, tasks: [] };

        this.forEachItem(Lang.bind(this, function(task) {
            object.tasks.push(task.serialize());
        }));

        this._serialize(object);
    },

    deserialize: function(object) {
        this.id = object.id;
        this._title = object.title;

        for (let i = 0; i < object.tasks; i++) {
            let task = this._newTask();
            task.deserialize(object.tasks[i]);
            this.addItem(task);
        }

        this._deserialize(object);
    },

    createTask: function(title, completedDate, dueDate, note) {
        let task = this._newTask({ title: title,
            completedDate: completedDate, dueDate: dueDate, note: note });

        this.addItem(task);
    },

    deleteTask: function(id) {
        this.removeItemById(id);
    },

    addItem: function(item) {
        if (!item.id) {
            while (true) {
                item.id = Utils.generateID('task');
                if (!this.getItemById(item.id))
                    break;
            }
        }

        Utils.BaseManager.prototype.addItem.call(this, item);
    },

    // Functions that subclasses should implement

    _serialize: function(object) {
    },
    
    _deserialize: function(object) {
    },
    
    _newTask: function(props) {
        return new Task(props);
    }
});

const Task = new Lang.Class({
    Name: 'Task',

    _init: function(props) {
        this.parent();

        if (props) {
            this.id = props.id;
            this._title = props.title;
            this._completedDate = props.completedDate;
            this._dueDate = dueDate;
            this._note = note;
        }
        else {
            // Initialize optional properties
            this._completedDate = null;
            this._dueDate = null;
            this._notes = null;
        }
    },

    get title() {
        return this._title;
    },

    set title(title) {
        this._title = title;
        this._updated('title');
    },

    get updatedDate() {
        return this._updatedDate;
    },

    get completedDate() {
        return this._completedDate;
    },

    set completedDate(completedDate) {
        if (this._completedDate.equal(completedDate))
            return;

        this._completedDate = completedDate;
        this._updated('completedDate');
    },

    get dueDate() {
        return this._dueDate;
    },

    set dueDate(dueDate) {
        if (this._dueDate.equal(dueDate))
            return;

        this._dueDate = dueDate;
        this._updated('dueDate');
    },

    get notes() {
        return this._notes;
    },

    set notes(notes) {
        if (this._notes == notes)
            return;

        this._notes = notes;
        this._updated('notes');
    },

    serialize: function() {
        let object = {
            kind:  'gnome-todo#task',
            title: this.title
        };

        if (this._completed)
            object.completed = this._completedDate.toISO8601();
        if (this._due)
            object.due = this._dueDate.toISO8601();
    },

    deserialize: function(object) {
        this.title = object.title;

        if (object.completed)
            this._completedDate = Utils.dateTimeFromISO8601(object.completed);
        if (object.due)
            this._dueDate = Utils.dateTimeFromISO8601(object.due);
    },

    _updated: function(property) {
        this._updatedDate = GLib.DateTime.new_now_utc();
        this.emit('changed', [property]);
    },
    
    // Functions that subclasses should implement

    _serialize: function(object) {
    },
    
    _deserialize: function(object) {
    },
});
Signals.addSignalMethods(Task.prototype)