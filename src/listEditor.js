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

const EggListBox = imports.gi.EggListBox;
const GObject = imports.gi.GObject;
const GdPrivate = imports.gi.GdPrivate;
const Gdk = imports.gi.Gdk;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;

const Lang = imports.lang;
const Signals = imports.signals;

const Config = imports.config;
const DatePicker = imports.datePicker;
const Global = imports.global;
const MainController = imports.mainController;
const Utils = imports.utils;

const ListEditorController = new Lang.Class({
    Name: 'ListEditorController',
    Extends: MainController.Controller,

    _init: function(mainController, list) {
        this.parent(mainController);

        this._list = list;

        this._initActions();

        this._toolbar = new ListEditorToolbar(list.title);
        this._toolbar.connect('back-button-clicked',
            Lang.bind(this, this._backButtonClicked));

        let source = Global.sourceManager.getItemById(list.source.id);
        this._view = new ListEditorView(source, list, this.window, this._actions);

        list.forEachItem(Lang.bind(this, function(task) {
            this._view.addItem(task);
        }));
        list.connect('item-removed',
            Lang.bind(this, this._taskRemoved));
    },

    _initActions: function() {
        let actionEntries = [
            {
                name: 'save',
                callback: this._save,
                enabled: false
            },
            {
                name: 'delete',
                callback: this._delete,
                enabled: true
            }];

        this._actions = Utils.createActions(this, actionEntries);
    },

    activate: function() {
        this.window.setToolbarWidget(this._toolbar);
        Utils.addActions(this.window, this._actions);
    },

    deactivate: function() {
        this.window.setToolbarWidget(null);
        Utils.removeActions(this.window, this._actions);
    },

    getView: function() {
        return this._view;
    },

    onCancel: function() {
        this.mainController.popController();
    },

    _backButtonClicked: function(toolbar) {
        this.mainController.popController();
    },

    _taskRemoved: function(list, task) {
        let item = this._view.getItemForTask(task);
        if (item)
            this._view.removeItem(item);
    },

    _save: function(saveAction, parameter) {
        let listItem = this._view.activeItem;
        // Create a new task if the listItem doesn't have a task yet.
        if (!listItem.getTask()) {
            let task = this._list.createTask(listItem.title,
                listItem.completedDate, null, null);
            listItem.setTask(task);
        }
        // Update the task otherwise
        else {
            let task = listItem.getTask();

            if (listItem.titleModified)
                task.title = listItem.title;
            if (listItem.completedDateModified)
                task.completedDate = listItem.completedDate;

            listItem.setTask(task);
        }
    },

    _delete: function(deleteAction, parameter) {
        let listItem = this._view.activeItem;
        let task = listItem.getTask();

        if (task)
            this._list.deleteTask(task.id);
        else
            this._view.removeItem(listItem);
    }
});

const ListEditorView = new Lang.Class({
    Name: 'ListEditorView',
    Extends: Gtk.Paned,

    _init: function(source, list, actionGroup, actions) {
        this.parent({ orientation: Gtk.Orientation.HORIZONTAL });

        this._source = source;
        this._list = list;
        this._actionGroup = actionGroup;
        this._actions = actions;

        this._activatedItem = null;

        this.listBox = new EggListBox.ListBox();
        this.listBox.show();
        this.pack1(this.listBox, true, false);

        this.taskEditor = new TaskEditor(source, actionGroup);
        this.pack2(this.taskEditor, false, false);
        this.taskEditor.hide();

        this.taskEditor.connect('cancelled',
            Lang.bind(this, this._taskEditorCancelled));

        this.listBox.set_sort_func(
            Lang.bind(this, this._listBoxSortFunc));
        this.listBox.set_separator_funcs(
            Lang.bind(this, this._listBoxSeparatorFunc));

        this.listBox.connect('child-activated',
            Lang.bind(this, this._childActivated));

        this.listBox.add(new NewListItem());

        this.show();
    },

    get activeItem() {
        return this._activatedItem;
    },

    addItem: function(task) {
        let listItem = new ListItem(this._list.id, this, task);
        this.listBox.add(listItem);

        listItem.connect('notify::modified',
            Lang.bind(this, function(item) {
                if (item != this._activatedItem)
                    return;

                let saveEnabled = item.title && item.modified;
                this._actions['save'].enabled = saveEnabled;
            }));

        return listItem;
    },

    removeItem: function(listItem) {
        if (listItem.active)
            this._activatedItem = listItem.deactivate(this);

        // Find the next and previous items.
        let prevItem = null, nextItem = null;
        let listItems = this.listBox.get_children();
        for (let i = 0; i < listItems.length; i++) {
            let item = listItems[i];

            if (item == listItem) {
                if (i + 1 < listItems.length) {
                    nextItem = listItems[i + 1];
                    if (nextItem.isNewListItem)
                        nextItem = null;
                }
                break;
            }
            prevItem = item;
        }

        this.listBox.remove(listItem);

        if (prevItem)
            this._activatedItem = prevItem.activate(this);
        else if (nextItem)
            this._activatedItem = nextItem.activate(this);
    },

    getItemForTask: function(task) {
        let listItems = this.listBox.get_children();
        for (let i = 0; i < listItems.length; i++) {
            let listItem = listItems[i];

            if (listItem.isNewListItem)
                continue;

            if (listItem.getTask() && listItem.getTask().id == task.id)
                return listItem;
        }
        return null;
    },

    _listBoxSortFunc: function(item1, item2) {
        if (item1.isNewListItem)
            return 1;
        if (item2.isNewListItem)
            return -1;

        if (item1.position < item2.position)
            return -1;
        if (item1.position > item2.position)
            return 1;

        return 0;
    },

    
    _listBoxSeparatorFunc: function(child, before) {

        return new Gtk.Separator({ 'orientation': Gtk.Orientation.HORIZONTAL });
    },

    _childActivated: function(listBox, listItem) {

        if (this._activatedItem)
            this._activatedItem.deactivate(this);

        this._activatedItem = listItem.activate(this);

        let saveEnabled = this._activatedItem.title && this._activatedItem.modified;
        this._actions['save'].enabled = saveEnabled;
    },

    _taskEditorCancelled: function(taskEditor) {

        this._activatedItem.deactivate(this);
        this._activatedItem = null;

        /* Set SelectionMode to NONE to unselect the item. */
        this.listBox.set_selection_mode(Gtk.SelectionMode.NONE);
        this.listBox.set_selection_mode(Gtk.SelectionMode.SINGLE);
    }
});

const ListItem = new Lang.Class({
    Name: 'ListItem',
    Extends: Gtk.Bin,

    Properties: { 'modified': GObject.ParamSpec.boolean('modified',
        'Modified', 'If item has been modified', GObject.ParamFlags.READABLE, false)
    },

    _init: function(listID, listEditor, task) {
        this.parent();

        this.isNewListItem = false;
        this.active = false;
        this._modified = false;
        this._titleModified = false;
        this._completedModified = false;
        this._listID = listID;
        this._listEditor = listEditor;

        this._completedDate = null;
        this._task = null;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_item.glade');
        this.add(builder.get_object('grid'));

        this._doneCheck = builder.get_object('done_check');
        this._doneCheck.connect('toggled', Lang.bind(this, this._doneCheckToggled));

        this._titleNotebook = builder.get_object('title_notebook');
        this._titleLabel =  builder.get_object('title_label');

        this._titleEntry = builder.get_object('title_entry');
        this._titleEntry.connect('changed',
            Lang.bind(this, this._titleEntryChanged));

        if (task)
            this.setTask(task);

        this.show();
    },

    setTask: function(task) {
        this._task = task;

        this._doneCheck.active = task.completedDate ? true : false;
        this._completedDate = task.completedDate;
        this._completedDateChanged();

        this._titleLabel.label = task.title;
        this._titleEntry.text = task.title;
        this._titleEntryChanged(this._titleEntry);

        if (this.active)
            this._listEditor.taskEditor.setTask(this._task, this._listID);
    },

    getTask: function() {
        return this._task;
    },
    
    activate: function(listEditor) {
        this.active = true;

        this._titleNotebook.set_current_page(1);

        listEditor.taskEditor.setTask(this._task, this._listID);
        listEditor.taskEditor.show();

        listEditor.listBox.select_child(this);
        this._titleEntry.grab_focus();

        return this;
    },

    deactivate: function(listEditor) {
        this.active = false;

        this._titleNotebook.set_current_page(0);
        listEditor.taskEditor.hide();
    },

    get modified() {
        return this._modified;
    },

    get titleModified() {
        return this._titleModified;
    },

    get completedDateModified() {
        return this._completedModified;
    },

    get title() {
        if (!this._titleEntry)
            return null;

        return this._titleEntry.text;
    },

    get completedDate() {
        if (!this._doneCheck)
            return null;

        if (!this._doneCheck.active)
            return null;

        if (this._task && this._task.completedDate)
            return this._task.completedDate;
        else
            return this._completedDate;
    },

    _titleEntryChanged: function(entry) {

        this._titleLabel.label = entry.text;

        let titleModified;
        if (this._task)
            titleModified = (entry.text != this._task.title);
        else
            titleModified = true;

        if (titleModified !== this._titleModified) {
            this._titleModified = titleModified;
            this._checkModified();
        }
    },

    _doneCheckToggled: function(doneCheck) {
        if (doneCheck.active) {
            let taskCompletedDate = this._task ? this._task.completedDate : null;
            if (taskCompletedDate)
                this._completedDate = taskCompletedDate;
            else
                this._completedDate = GLib.DateTime.new_now_utc();
        }
        else
            this._completedDate = null;

        this._completedDateChanged();
    },

    _completedDateChanged: function() {
        let taskCompletedDate = this._task ? this._task.completedDate : null;

        let modified = !GdPrivate.date_time_equal(this._completedDate, taskCompletedDate);
        if (modified != this._completedModifed) {
            this._completedModified = modified;
            this._checkModified();
        }
    },

    _checkModified: function() {
        let modified = this._titleModified || this._completedModified;

        if (modified != this._modified) {
            this._modified = modified;
            this.notify('modified');
        }
    }
});

const NewListItem = new Lang.Class({
    Name: 'NewListItem',
    Extends: Gtk.Bin,

    _init: function(task) {
        this.parent();

        this.isNewListItem = true;
        this.task = task;

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/new_list_item.glade');
        this.add(builder.get_object('grid'));

        this.show();
    },

    activate: function(listEditor) {
        let newItem = listEditor.addItem(null);
        listEditor.listBox.select_child(newItem);

        newItem.activate(listEditor);
        return newItem;
    }
});

const LIST_COMBO_COLUMN_TITLE = 0;
const LIST_COMBO_COLUMN_ID    = 1;

const TaskEditor = new Lang.Class({
    Name: 'TaskEditor',
    Extends: Gtk.Bin,

    Signals: {
        'cancelled': {}
    },

    _init: function(source, actionGroup) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/task_editor.glade');
        this._taskEditor = builder.get_object('task_editor');
        this.add(this._taskEditor);
        this.show_all();

        this._noteTextBuffer = builder.get_object('note_textbuffer');
        this._listCombo = builder.get_object('list_combo');
        this._listStore = builder.get_object('list_store');

        let dueDatePlaceholder = builder.get_object('due_date_placeholder');
        this._dueDatePicker = new DatePicker.DatePicker();
        dueDatePlaceholder.add(this._dueDatePicker);

        let deleteButton = builder.get_object('delete_button');
        deleteButton.connectClickedToAction(actionGroup, 'delete');

        let cancelButton = builder.get_object('cancel_button');
        cancelButton.connect('clicked', Lang.bind(this, function(button) {
            this.emit('cancelled');
        }));

        let saveButton = builder.get_object('save_button');
        saveButton.connectSensitiveToAction(actionGroup, 'save');
        saveButton.connectClickedToAction(actionGroup, 'save');

        this._setSource(source);
    },

    setTask: function(task, listID) {
        this._task = task;

        if (task && task.notes)
            this._noteTextBuffer.text = task.notes;
        else
            this._noteTextBuffer.text = '';

        let dueDate = task ? task.dueDate : null;
        this._dueDatePicker.setDateTime(dueDate);

        let iter = this._getIterFromListID(listID);
        this._listCombo.set_active_iter(iter);
    },

    _setSource: function(source) {
        this._source = source;

        source.forEachItem(Lang.bind(this, function(list) {
            this._listAdded(source, list);
        }));
        source.connect('item-added', Lang.bind(this, this._listAdded));
        source.connect('item-updated', Lang.bind(this, this._listUpdated));
        source.connect('item-removed', Lang.bind(this, this._listRemoved));
    },

    _listAdded: function(source, list) {
        let iter = this._listStore.append();
        this._listStore.set_value(iter, LIST_COMBO_COLUMN_ID, list.id);
        this._listStore.set_value(iter, LIST_COMBO_COLUMN_TITLE, list.title);
    },

    _listUpdated: function(source, list) {
        let iter = this._getIterFromListID(list.id);
        if (iter)
            this._listStore.set_value(iter, LIST_COMBO_COLUMN_TITLE, list.title);
    },

    _listRemoved: function(source, list) {
        let iter = this._getIterFromListID(list.id);
        if (iter)
            this._listStore.remove(iter);
    },

    _getIterFromListID: function(listID) {
        for (let [res, iter] = this._listStore.get_iter_first();
            res;
            res = this._listStore.iter_next(iter))
        {
            let id = this._listStore.get_value(iter, LIST_COMBO_COLUMN_ID);
            if (id == listID)
                return iter;
        }
        return null;
    }
});

const ListEditorToolbar = new Lang.Class({
    Name: 'ListEditorToolbar',
    Extends: Gtk.Bin,

    _init: function(title) {
        this.parent();

        let builder = new Gtk.Builder();
        builder.add_from_resource('/org/gnome/todo/ui/list_editor_toolbar.glade');
        this._headerBar = builder.get_object('header-bar');
        this.add(this._headerBar);
        this.show();

        let backButton = builder.get_object('back-button');
        backButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('back-button-clicked')
            }));

        let sendButton = builder.get_object('send-button');
        sendButton.connect('clicked',
            Lang.bind(this, function(button) {
                this.emit('send-button-clicked')
            }));

        this._headerBar.title = title;
    },

    setTitle: function(title) {
        this._headerBar.title = title;
    },

    setToolbar: function(mainToolbar) {
        this._mainToolbar = mainToolbar;
    }
});
Signals.addSignalMethods(ListEditorToolbar.prototype);