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

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const Utils = imports.utils;

const _ = imports.gettext.gettext;

const Source = new Lang.Class({
    Name: 'Source',
    Extends: Utils.BaseManager,

    _init: function() {
        let path = GLib.build_filename([GLib.get_user_data_dir(), 'gnome-todo', this.id. null]);
        this._file = Gio.File.new_for_path(path);

        this._load();
    },

    sync: function(callback) {
    },

    createTaskList: function(title) {
        let id;
        while (true) {
            id = Utils.generateID('task');
            if (!this.getItemById(id))
                break;
        }

        let taskList = this._newTaskList(id, title);
        taskList.id = id;
        taskList.title = title;

        this.addItem(taskList);
    },

    deleteTaskList: function(id) {
        this.removeItemById(id);
    },

    _load: function() {
        let [res, data] = this._file.load_contents(null);
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

    _serialize: function(object) {
    },

    _deserialize: function(object) {
    },

    _newTaskList: function() {
        return new TaskList();
    }
});

const TaskList = new Lang.Class({
    Name: 'TaskList',
    Extends: Utils.BaseManager,

    _init: function(id, title) {
        this.id = id;
        this._title = title;
    }

    get title() {
        return this._title;
    },

    set title() {
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

    createTask: function(title, completed, due, note) {
        let id;
        while (true) {
            id = Utils.generateID('task');
            if (!this.getItemById(id))
                break;
        }

        let task = this._newTask();
        task.id = id;
        task.title = title;
        task.completed = completed;
        task.due = due;
        task.note = note;

        this.addItem(task);
    },

    deleteTask: function(id) {
        this.removeItemById(id);
    },

    // Functions that subclasses should implement

    _serialize: function(object) {
    },
    
    _deserialize: function(object) {
    },
    
    _newTask: function() {
        return new Task();
    }
});

const Task = new Lang.Class({
    Name: 'Task',

    _init: function() {
    },

    get title() {
        return this._title;
    }

    set title(title) {
        this._title = title;
        this.emit('changed', 'title');
    },

    get completedDate() {
        return this._completedDate;
    },

    set completedDate() {
        this._completedDate = completedDate;
        this.emit('changed', 'completedDate');
    }

    get dueDate() {
    },

    set dueDate() {
        this._dueDate = dueDate;
        this.emit('changed', 'dueDate');
    }

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

    // Functions that subclasses should implement

    _serialize: function(object) {
    },
    
    _deserialize: function(object) {
    },
});